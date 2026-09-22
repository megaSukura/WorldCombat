package dev.worldcombat.core.world;

import com.mojang.serialization.JsonOps;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.core.RegistryAccess;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.RegistryOps;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import java.util.*;

/** Reads the installed registries and native values, including data-pack and mod contributions. */
public final class NativeRegistryFacts {
    private NativeRegistryFacts() {}

    public static RegistryObservation entry(RegistryAccess access, String registryId, String id) {
        var key = ResourceKey.<Object>createRegistryKey(ResourceLocation.parse(registryId));
        return access.registry(key).flatMap(registry -> registry.getHolder(ResourceLocation.parse(id)))
            .map(holder -> new RegistryObservation(registryId, id,
                holder.tags().map(tag -> tag.location().toString()).toList())).orElse(null);
    }

    public static ItemObservation item(HolderLookup.Provider access, String id) {
        if (id.startsWith("{")) return stack(access, parseStack(access, id));
        return BuiltInRegistries.ITEM.getHolder(ResourceLocation.parse(id))
            .map(holder -> stack(access, new ItemStack(holder))).orElse(null);
    }

    public static ItemStack parseStack(HolderLookup.Provider access, String input) {
        if (!input.startsWith("{")) return BuiltInRegistries.ITEM.getHolder(ResourceLocation.parse(input))
            .map(ItemStack::new).orElseThrow(() -> new IllegalArgumentException("Unknown item: " + input));
        return ItemStack.OPTIONAL_CODEC.parse(RegistryOps.create(JsonOps.INSTANCE, access), com.google.gson.JsonParser.parseString(input))
            .getOrThrow(message -> new IllegalArgumentException("Invalid item stack: " + message));
    }

    public static String serializeStack(HolderLookup.Provider access, ItemStack stack) {
        return ItemStack.OPTIONAL_CODEC.encodeStart(RegistryOps.create(JsonOps.INSTANCE, access), stack)
            .result().map(Object::toString).orElse(null);
    }

    public static ItemObservation stack(HolderLookup.Provider access, ItemStack stack) {
        var ids = new HashSet<String>();
        var components = new TreeMap<String, String>();
        var ops = RegistryOps.create(JsonOps.INSTANCE, access);
        for (var component : stack.getComponents()) {
            var key = BuiltInRegistries.DATA_COMPONENT_TYPE.getKey(component.type());
            if (key == null) continue;
            String id = key.toString(); ids.add(id);
            if (component.type().codec() != null)
                component.encodeValue(ops).result().ifPresent(value -> components.put(id, value.toString()));
        }
        return new ItemObservation(stack.isEmpty() ? "" : BuiltInRegistries.ITEM.getKey(stack.getItem()).toString(),
            stack.getCount(), stack.isEmpty() ? "" : stack.getDescriptionId(), stack.getMaxStackSize(), stack.getDamageValue(),
            stack.getMaxDamage(), stack.getTags().map(tag -> tag.location().toString()).toList(), ids, components,
            serializeStack(access, stack));
    }

    public static FluidObservation fluid(MinecraftCombat combat, ActorHandle actor, Point point) {
        var entity = combat.resolve(actor); if (entity == null) return null;
        var level = entity.level(); var pos = BlockPos.containing(point.x(), point.y(), point.z());
        if (!level.hasChunkAt(pos) || level.isOutsideBuildHeight(pos) || !level.getWorldBorder().isWithinBounds(pos)) return null;
        var state = level.getFluidState(pos);
        return new FluidObservation(new Point(pos.getX(), pos.getY(), pos.getZ()),
            new RegistryObservation("minecraft:fluid", BuiltInRegistries.FLUID.getKey(state.getType()).toString(),
                state.getTags().map(tag -> tag.location().toString()).toList()),
            state.isEmpty(), state.isSource(), state.getAmount(), state.getHeight(level, pos),
            MinecraftCombat.point(state.getFlow(level, pos)), NativeBlockStates.properties(state));
    }
}
