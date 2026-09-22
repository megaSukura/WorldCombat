package dev.worldcombat.core.world;

import com.google.gson.*;
import dev.worldcombat.core.runtime.Appearance;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.*;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.*;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import java.util.*;

/**
 * A persistent, script-defined body. Its behaviour is a persistent world effect (its "brain") whose source and
 * target are the body itself, so it outlives the action, the summoner and server restarts. Appearance, size and
 * physics come from a JSON configuration; interactions, touches, block collisions and death reach content as
 * host hooks and as operations on the brain.
 */
public final class ScriptedBody extends PathfinderMob {
    private static final EntityDataAccessor<String> APPEARANCE = SynchedEntityData.defineId(ScriptedBody.class, EntityDataSerializers.STRING);
    private static final EntityDataAccessor<Float> WIDTH = SynchedEntityData.defineId(ScriptedBody.class, EntityDataSerializers.FLOAT);
    private static final EntityDataAccessor<Float> HEIGHT = SynchedEntityData.defineId(ScriptedBody.class, EntityDataSerializers.FLOAT);
    private static final EntityDataAccessor<Boolean> PUSHABLE = SynchedEntityData.defineId(ScriptedBody.class, EntityDataSerializers.BOOLEAN);
    private static final EntityDataAccessor<Boolean> TARGETABLE = SynchedEntityData.defineId(ScriptedBody.class, EntityDataSerializers.BOOLEAN);
    private String definition = "";
    private long brain;
    private UUID summoner, owner;
    private String config = "{}";
    private final Map<UUID, Long> touched = new HashMap<>();
    private long blockedAt;

    public ScriptedBody(EntityType<? extends PathfinderMob> type, Level level) { super(type, level); setPersistenceRequired(); }
    public static AttributeSupplier.Builder attributes() {
        return Mob.createMobAttributes().add(Attributes.MAX_HEALTH, 20).add(Attributes.MOVEMENT_SPEED, 0.25).add(Attributes.KNOCKBACK_RESISTANCE, 0).add(Attributes.FOLLOW_RANGE, 32);
    }
    @Override protected void defineSynchedData(SynchedEntityData.Builder builder) {
        super.defineSynchedData(builder);
        builder.define(APPEARANCE, ""); builder.define(WIDTH, 0.6f); builder.define(HEIGHT, 0.9f); builder.define(PUSHABLE, true);
        builder.define(TARGETABLE, true);
    }
    public String definition() { return definition; }
    public long brain() { return brain; }
    public UUID summoner() { return summoner; }
    public UUID owner() { return owner; }
    public String config() { return config; }
    public String appearance() { return entityData.get(APPEARANCE); }
    void identity(String definition, long brain, UUID summoner, UUID owner) {
        this.definition = definition; this.brain = brain; this.summoner = summoner; this.owner = owner;
    }
    /**
     * Applies a configuration object. Recognised: appearance (object, see Appearance), size [w,h] (0.1..8),
     * health (1..1024, sets maximum and current), speed (0..2), gravity (bool), pushable (bool), invulnerable (bool),
     * knockbackResistance (0..1), name (text) / nameVisible (bool), silent (bool), fireImmune (bool), glow (bool).
     * Fields that are absent keep their current value; the merged configuration is what `config()` returns.
     */
    public void configure(String json) {
        JsonObject root;
        try { var value = JsonParser.parseString(json); root = value.isJsonObject() ? value.getAsJsonObject() : new JsonObject(); }
        catch (RuntimeException malformed) { throw new IllegalArgumentException("Body configuration must be a JSON object"); }
        JsonObject merged;
        try { merged = JsonParser.parseString(config).getAsJsonObject(); } catch (RuntimeException ignored) { merged = new JsonObject(); }
        for (var entry : root.entrySet()) merged.add(entry.getKey(), entry.getValue());
        if (root.has("appearance")) {
            var appearance = root.get("appearance");
            entityData.set(APPEARANCE, appearance.isJsonObject() ? Appearance.of(appearance.toString()).json() : "");
        }
        if (root.has("size") && root.get("size").isJsonArray() && root.getAsJsonArray("size").size() == 2) {
            var size = root.getAsJsonArray("size");
            float width = clamp(size.get(0).getAsFloat(), 0.1f, 8f), height = clamp(size.get(1).getAsFloat(), 0.1f, 8f);
            entityData.set(WIDTH, width); entityData.set(HEIGHT, height); refreshDimensions();
        }
        if (root.has("health")) {
            double health = clamp(root.get("health").getAsDouble(), 1, 1024);
            var maximum = getAttribute(Attributes.MAX_HEALTH);
            if (maximum != null) maximum.setBaseValue(health);
            setHealth((float) health);
        }
        if (root.has("speed")) { var speed = getAttribute(Attributes.MOVEMENT_SPEED); if (speed != null) speed.setBaseValue(clamp(root.get("speed").getAsDouble(), 0, 2)); }
        if (root.has("knockbackResistance")) { var resistance = getAttribute(Attributes.KNOCKBACK_RESISTANCE); if (resistance != null) resistance.setBaseValue(clamp(root.get("knockbackResistance").getAsDouble(), 0, 1)); }
        if (root.has("gravity")) setNoGravity(!root.get("gravity").getAsBoolean());
        if (root.has("pushable")) entityData.set(PUSHABLE, root.get("pushable").getAsBoolean());
        if (root.has("targetable")) entityData.set(TARGETABLE, root.get("targetable").getAsBoolean());
        if (root.has("noPhysics")) noPhysics = root.get("noPhysics").getAsBoolean();
        if (root.has("invulnerable")) setInvulnerable(root.get("invulnerable").getAsBoolean());
        if (root.has("silent")) setSilent(root.get("silent").getAsBoolean());
        if (root.has("glow")) setGlowingTag(root.get("glow").getAsBoolean());
        if (root.has("name")) {
            var name = root.get("name");
            if (name.isJsonNull() || name.getAsString().isEmpty()) { setCustomName(null); setCustomNameVisible(false); }
            else { setCustomName(Component.literal(name.getAsString().length() > 64 ? name.getAsString().substring(0, 64) : name.getAsString())); setCustomNameVisible(!root.has("nameVisible") || root.get("nameVisible").getAsBoolean()); }
        } else if (root.has("nameVisible")) setCustomNameVisible(root.get("nameVisible").getAsBoolean());
        config = merged.toString();
    }
    private static float clamp(float value, float low, float high) { return Float.isFinite(value) ? Math.max(low, Math.min(high, value)) : low; }
    private static double clamp(double value, double low, double high) { return Double.isFinite(value) ? Math.max(low, Math.min(high, value)) : low; }
    private boolean configuredFireImmune() {
        try { var root = JsonParser.parseString(config).getAsJsonObject(); return root.has("fireImmune") && root.get("fireImmune").getAsBoolean(); }
        catch (RuntimeException ignored) { return false; }
    }
    @Override public boolean fireImmune() { return super.fireImmune() || configuredFireImmune(); }

    @Override public EntityDimensions getDefaultDimensions(Pose pose) {
        return EntityDimensions.scalable(entityData.get(WIDTH), entityData.get(HEIGHT)).withEyeHeight(entityData.get(HEIGHT) * 0.85f);
    }
    @Override public void onSyncedDataUpdated(EntityDataAccessor<?> key) {
        super.onSyncedDataUpdated(key);
        if (WIDTH.equals(key) || HEIGHT.equals(key)) refreshDimensions();
    }
    @Override public boolean isPushable() { return entityData.get(PUSHABLE) && super.isPushable(); }
    public boolean targetable() { return entityData.get(TARGETABLE); }
    @Override public boolean isPickable() { return targetable() && super.isPickable(); }
    @Override public boolean canBeSeenAsEnemy() { return targetable() && super.canBeSeenAsEnemy(); }
    @Override public boolean canBeCollidedWith() { return !noPhysics && super.canBeCollidedWith(); }
    @Override protected void registerGoals() {}
    @Override protected boolean shouldDropLoot() { return false; }
    @Override public boolean shouldDropExperience() { return false; }
    @Override public boolean removeWhenFarAway(double distance) { return false; }
    @Override protected boolean shouldDespawnInPeaceful() { return false; }

    @Override public void addAdditionalSaveData(CompoundTag tag) {
        super.addAdditionalSaveData(tag);
        tag.putString("WorldCombatDefinition", definition); tag.putLong("WorldCombatBrain", brain);
        if (summoner != null) tag.putUUID("WorldCombatSummoner", summoner);
        if (owner != null) tag.putUUID("WorldCombatOwner", owner);
        tag.putString("WorldCombatConfig", config);
        tag.putString("WorldCombatAppearance", entityData.get(APPEARANCE));
        tag.putFloat("WorldCombatWidth", entityData.get(WIDTH)); tag.putFloat("WorldCombatHeight", entityData.get(HEIGHT));
        tag.putBoolean("WorldCombatPushable", entityData.get(PUSHABLE));
    }
    @Override public void readAdditionalSaveData(CompoundTag tag) {
        super.readAdditionalSaveData(tag);
        definition = tag.getString("WorldCombatDefinition"); brain = tag.getLong("WorldCombatBrain");
        summoner = tag.hasUUID("WorldCombatSummoner") ? tag.getUUID("WorldCombatSummoner") : null;
        owner = tag.hasUUID("WorldCombatOwner") ? tag.getUUID("WorldCombatOwner") : null;
        config = tag.contains("WorldCombatConfig") ? tag.getString("WorldCombatConfig") : "{}";
        entityData.set(APPEARANCE, tag.getString("WorldCombatAppearance"));
        if (tag.contains("WorldCombatWidth")) { entityData.set(WIDTH, tag.getFloat("WorldCombatWidth")); entityData.set(HEIGHT, tag.getFloat("WorldCombatHeight")); refreshDimensions(); }
        if (tag.contains("WorldCombatPushable")) entityData.set(PUSHABLE, tag.getBoolean("WorldCombatPushable"));
        var savedConfig = JsonParser.parseString(config).getAsJsonObject();
        if (savedConfig.has("targetable")) entityData.set(TARGETABLE, savedConfig.get("targetable").getAsBoolean());
        if (savedConfig.has("noPhysics")) noPhysics = savedConfig.get("noPhysics").getAsBoolean();
    }

    private WorldBodies bodies() {
        return level() instanceof net.minecraft.server.level.ServerLevel serverLevel ? CombatServices.get(serverLevel.getServer()).bodies() : null;
    }
    @Override protected InteractionResult mobInteract(Player player, InteractionHand hand) {
        var bodies = bodies();
        if (bodies == null) return InteractionResult.PASS;
        return bodies.interact(this, player, hand) ? InteractionResult.CONSUME : InteractionResult.PASS;
    }
    @Override public void tick() {
        var bodies = bodies();
        if (bodies != null && !bodies.alive(this)) { discard(); return; }
        super.tick();
        if (bodies == null || isRemoved()) return;
        long now = level().getGameTime();
        for (var other : level().getEntities(this, getBoundingBox().inflate(0.05))) {
            if (!(other instanceof LivingEntity living) || living == this) continue;
            var last = touched.get(living.getUUID());
            if (last != null && now - last < 10) continue;
            touched.put(living.getUUID(), now);
            bodies.touched(this, living);
        }
        if (touched.size() > 64) touched.entrySet().removeIf(entry -> now - entry.getValue() > 40);
        if ((horizontalCollision || verticalCollision) && now - blockedAt >= 5) { blockedAt = now; bodies.blocked(this); }
    }
    @Override public void die(DamageSource source) {
        var bodies = bodies();
        if (bodies != null) bodies.died(this, source);
        super.die(source);
    }
}
