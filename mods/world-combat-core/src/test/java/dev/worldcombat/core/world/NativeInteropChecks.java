package dev.worldcombat.core.world;

import com.google.gson.JsonParser;
import com.mojang.serialization.Codec;
import com.mojang.serialization.Lifecycle;
import dev.worldcombat.core.runtime.BlockObservation;
import dev.worldcombat.core.runtime.Point;
import net.minecraft.core.*;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.registries.*;
import net.minecraft.resources.*;
import net.minecraft.tags.TagKey;
import net.minecraft.world.damagesource.*;
import net.minecraft.world.item.*;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.*;
import net.minecraft.world.level.block.state.properties.*;
import java.util.*;

/** Native registry/property/component behavior in an isolated JVM. */
public final class NativeInteropChecks {
    static final class StatefulBlock extends Block {
        static final BooleanProperty ACTIVE = BooleanProperty.create("active");
        static final IntegerProperty VALUE = IntegerProperty.create("value", 0, 4);
        StatefulBlock() { super(BlockBehaviour.Properties.of()); }
        @Override protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) { builder.add(ACTIVE, VALUE); }
    }
    static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
    @FunctionalInterface interface Checked { void run() throws Exception; }
    static void rejects(Checked callback) throws Exception {
        try { callback.run(); }
        catch (IllegalArgumentException | com.mojang.brigadier.exceptions.CommandSyntaxException expected) { return; }
        throw new AssertionError("Invalid native state was accepted");
    }
    static ResourceLocation id(String value) { return ResourceLocation.parse(value); }
    public static void main(String[] args) throws Exception {
        net.minecraft.SharedConstants.tryDetectVersion();
        net.neoforged.fml.loading.LoadingModList.of(List.of(), List.of(), List.of(), List.of(), Map.of());
        net.minecraft.server.Bootstrap.bootStrap();

        ((MappedRegistry<Block>) BuiltInRegistries.BLOCK).unfreeze();
        var block = Registry.register(BuiltInRegistries.BLOCK, id("checks:stateful"), new StatefulBlock());
        BuiltInRegistries.BLOCK.freeze();
        var original = block.defaultBlockState().setValue(StatefulBlock.ACTIVE, true).setValue(StatefulBlock.VALUE, 3);
        var changed = NativeBlockStates.parse(BuiltInRegistries.BLOCK.asLookup(), "checks:stateful[active=false]", original);
        check(!changed.getValue(StatefulBlock.ACTIVE) && changed.getValue(StatefulBlock.VALUE) == 3, "Partial write reset a native property");
        var view = new BlockObservation(new Point(0, 0, 0), "checks:stateful", original.toString(), NativeBlockStates.properties(original), "[\"c:checks\"]", false);
        check(NativeBlockStates.parse(BuiltInRegistries.BLOCK.asLookup(), view.blockState(), null).equals(original), "Full state did not round trip");
        check(view.tagged("c:checks") && !view.tagged("c:check"), "Membership used a substring");
        rejects(() -> NativeBlockStates.parse(BuiltInRegistries.BLOCK.asLookup(), "checks:stateful[value=9]", original));
        rejects(() -> NativeBlockStates.parse(BuiltInRegistries.BLOCK.asLookup(), "checks:stateful[unknown=true]", original));
        rejects(() -> NativeBlockStates.parse(BuiltInRegistries.BLOCK.asLookup(), "checks:stateful trailing", original));

        var registryKey = ResourceKey.<String>createRegistryKey(id("checks:entries"));
        var registry = new MappedRegistry<String>(registryKey, Lifecycle.stable());
        var entry = Registry.registerForHolder(registry, id("checks:entry"), "value"); registry.freeze();
        var tag = TagKey.create(registryKey, id("c:checks"));
        registry.bindTags(Map.of(tag, List.of(entry)));
        var access = new RegistryAccess.ImmutableRegistryAccess(List.of(registry));
        var snapshot = NativeRegistryFacts.entry(access, "checks:entries", "checks:entry");
        check(snapshot != null && snapshot.tagged("c:checks"), "Common-namespace native tag was absent");
        registry.bindTags(Map.of(tag, List.of()));
        check(snapshot.tagged("c:checks") && !NativeRegistryFacts.entry(access, "checks:entries", "checks:entry").tagged("c:checks"),
            "Registry reload altered an existing snapshot or left a stale current view");
        check(NativeRegistryFacts.entry(access, "checks:missing", "checks:entry") == null
            && NativeRegistryFacts.entry(access, "checks:entries", "checks:missing") == null, "Unknown registry/entry was replaced with a default");

        ((MappedRegistry<Item>) BuiltInRegistries.ITEM).unfreeze();
        var item = Registry.register(BuiltInRegistries.ITEM, id("checks:item"), new Item(new Item.Properties().stacksTo(16)));
        BuiltInRegistries.ITEM.freeze();
        ((MappedRegistry<DataComponentType<?>>) BuiltInRegistries.DATA_COMPONENT_TYPE).unfreeze();
        var component = Registry.register(BuiltInRegistries.DATA_COMPONENT_TYPE, id("checks:value"), DataComponentType.<Integer>builder().persistent(Codec.INT).build());
        BuiltInRegistries.DATA_COMPONENT_TYPE.freeze();
        var nativeAccess = RegistryAccess.fromRegistryOfRegistries(BuiltInRegistries.REGISTRY);
        var stack = new ItemStack(item, 4); stack.set(component, 7); stack.set(DataComponents.MAX_STACK_SIZE, 12); stack.remove(DataComponents.REPAIR_COST);
        var itemView = NativeRegistryFacts.stack(nativeAccess, stack);
        var restored = NativeRegistryFacts.parseStack(nativeAccess, itemView.serialized());
        check(ItemStack.matches(stack, restored), "Native stack codec lost component additions/removals or count");
        stack.set(component, 9); stack.setCount(1);
        check(itemView.count() == 4 && itemView.component("checks:value").equals("7") && itemView.maxCount() == 12,
            "Retained item view changed with its native stack");
        check(!itemView.hasComponent("minecraft:repair_cost") && itemView.component("checks:absent") == null, "Absent component became a value");
        check(NativeRegistryFacts.item(nativeAccess, "checks:missing") == null, "Unknown item became the default item");

        var damage = new MappedRegistry<DamageType>(Registries.DAMAGE_TYPE, Lifecycle.stable());
        var damageEntry = Registry.registerForHolder(damage, id("checks:damage"), new DamageType("checks", 0)); damage.freeze();
        var damageTag = TagKey.create(Registries.DAMAGE_TYPE, id("checks:category")); damage.bindTags(Map.of(damageTag, List.of(damageEntry)));
        var payload = JsonParser.parseString("{\"extension\":{\"value\":7},\"damageType\":\"checks:stale\"}").getAsJsonObject();
        NativeDamageFacts.add(payload, new DamageSource(damageEntry), null, "");
        check(payload.get("damageType").getAsString().equals("checks:damage") && payload.getAsJsonArray("damageTags").get(0).getAsString().equals("checks:category"),
            "Damage provenance lost native registry identity");
        check(payload.getAsJsonObject("extension").get("value").getAsInt() == 7 && !payload.get("direct").getAsBoolean()
            && !payload.get("sourceLiving").getAsBoolean() && payload.get("sourceEntity").getAsString().isEmpty(),
            "Environmental damage fabricated a living attacker or lost extension metadata");
        System.out.println("PASS native interop: property-preserving states, exact/reloaded tags, detached components, native stack round trips and damage provenance");
    }
}
