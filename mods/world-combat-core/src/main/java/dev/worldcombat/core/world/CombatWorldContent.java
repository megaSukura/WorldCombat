package dev.worldcombat.core.world;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.level.material.PushReaction;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.*;

public final class CombatWorldContent {
    private static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("world_combat_core");
    private static final DeferredRegister<BlockEntityType<?>> ENTITIES = DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, "world_combat_core");
    private static final DeferredRegister<MobEffect> EFFECTS = DeferredRegister.create(Registries.MOB_EFFECT, "world_combat_core");
    private static final DeferredRegister<net.minecraft.world.entity.EntityType<?>> BODIES = DeferredRegister.create(Registries.ENTITY_TYPE, "world_combat_core");
    public static final DeferredHolder<net.minecraft.world.entity.EntityType<?>, net.minecraft.world.entity.EntityType<CombatProjectile>> PROJECTILE = BODIES.register("projectile",
        () -> net.minecraft.world.entity.EntityType.Builder.<CombatProjectile>of(CombatProjectile::new, net.minecraft.world.entity.MobCategory.MISC)
            .sized(0.25f, 0.25f).clientTrackingRange(4).updateInterval(1).noSave().noSummon().build("world_combat_core:projectile"));
    public static final DeferredHolder<net.minecraft.world.entity.EntityType<?>, net.minecraft.world.entity.EntityType<HelperActor>> HELPER = BODIES.register("helper",
        () -> net.minecraft.world.entity.EntityType.Builder.of(HelperActor::new, net.minecraft.world.entity.MobCategory.MISC).sized(0.6f, 0.9f).noSave().noSummon().build("world_combat_core:helper"));
    public static final DeferredHolder<net.minecraft.world.entity.EntityType<?>, net.minecraft.world.entity.EntityType<ScriptedBody>> BODY = BODIES.register("body",
        () -> net.minecraft.world.entity.EntityType.Builder.of(ScriptedBody::new, net.minecraft.world.entity.MobCategory.MISC).sized(0.6f, 0.9f).clientTrackingRange(10).updateInterval(2).noSummon().build("world_combat_core:body"));
    public static final DeferredBlock<TemporaryRock> ROCK = BLOCKS.register("temporary_rock",
        () -> new TemporaryRock(BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(0.6f).noLootTable().pushReaction(PushReaction.BLOCK)));
    public static final DeferredHolder<BlockEntityType<?>, BlockEntityType<TemporaryRock.Lease>> ROCK_ENTITY =
        ENTITIES.register("temporary_rock", () -> BlockEntityType.Builder.of(TemporaryRock.Lease::new, ROCK.get()).build(null));
    public static final DeferredHolder<MobEffect, MobEffect> WARD = EFFECTS.register("ward", () -> new Ward());
    private static final class Ward extends MobEffect { Ward() { super(MobEffectCategory.BENEFICIAL, 0x65D8C5); } }
    public static void register(IEventBus bus) {
        BLOCKS.register(bus); ENTITIES.register(bus); EFFECTS.register(bus); BODIES.register(bus);
        bus.addListener((net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent event) -> { event.put(HELPER.get(), HelperActor.attributes().build()); event.put(BODY.get(), ScriptedBody.attributes().build()); });
    }
}
