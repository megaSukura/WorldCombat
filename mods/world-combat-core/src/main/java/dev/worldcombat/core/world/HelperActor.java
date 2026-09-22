package dev.worldcombat.core.world;

import net.minecraft.network.syncher.*;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.*;
import net.minecraft.world.level.Level;

/** One generic temporary body. Its purpose, decisions and effects are defined by content. */
public final class HelperActor extends PathfinderMob {
    private static final EntityDataAccessor<String> APPEARANCE = SynchedEntityData.defineId(HelperActor.class, EntityDataSerializers.STRING);
    public HelperActor(EntityType<? extends PathfinderMob> type, Level level) { super(type, level); setPersistenceRequired(); }
    public static AttributeSupplier.Builder attributes() {
        return Mob.createMobAttributes().add(Attributes.MAX_HEALTH, 20).add(Attributes.MOVEMENT_SPEED, 0.25);
    }
    @Override protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(APPEARANCE, "");
    }
    public void appearance(String json) { entityData.set(APPEARANCE, json == null ? "" : json); }
    public String appearance() { return entityData.get(APPEARANCE); }
    @Override protected void registerGoals() {}
    @Override protected boolean shouldDropLoot() { return false; }
    @Override public boolean shouldDropExperience() { return false; }
    @Override public boolean shouldBeSaved() { return false; }
    @Override public void tick() {
        if (level() instanceof net.minecraft.server.level.ServerLevel serverLevel
            && !CombatServices.get(serverLevel.getServer()).helpers().owns(this)) {
            discard(); return;
        }
        super.tick();
    }
}
