package dev.worldcombat.core.world;

import com.google.gson.*;
import com.mojang.authlib.GameProfile;
import dev.worldcombat.core.runtime.*;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.capabilities.Capabilities;
import net.neoforged.neoforge.common.CommonHooks;
import net.neoforged.neoforge.common.util.BlockSnapshot;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.items.ItemHandlerHelper;
import java.util.*;

/**
 * Lasting changes to the world under the acting identity: blocks, block entities, containers, items, explosions,
 * lightning, fire and aggression. Every write goes through the same NeoForge events and protections a player or
 * mob would trigger, so claim and protection mods keep their say.
 */
public final class NativeWorldWrites {
    private NativeWorldWrites() {}
    private record Actor(LivingEntity entity, ServerLevel level, ServerPlayer player, Player proxy) {}
    private static Actor actor(MinecraftCombat combat, ActorHandle handle, UUID controller) {
        var entity = combat.resolve(handle); if (entity == null) return null;
        var level = (ServerLevel) entity.level();
        var player = controller == null ? null : combat.server().getPlayerList().getPlayer(controller);
        Player proxy = player != null ? player : FakePlayerFactory.get(level, new GameProfile(entity.getUUID(), "WorldCombat"));
        if (proxy != player) proxy.moveTo(entity.getX(), entity.getY(), entity.getZ(), entity.getYRot(), entity.getXRot());
        return new Actor(entity, level, player, proxy);
    }
    private static BlockPos pos(Point point) { return BlockPos.containing(point.x(), point.y(), point.z()); }
    private static boolean loaded(ServerLevel level, BlockPos pos) {
        return level.hasChunkAt(pos) && !level.isOutsideBuildHeight(pos) && level.getWorldBorder().isWithinBounds(pos);
    }
    private static JsonObject object(String json) {
        try { var value = JsonParser.parseString(json == null || json.isBlank() ? "{}" : json); return value.isJsonObject() ? value.getAsJsonObject() : new JsonObject(); }
        catch (RuntimeException malformed) { return new JsonObject(); }
    }
    private static boolean flag(JsonObject data, String key, boolean fallback) {
        return data.has(key) && data.get(key).isJsonPrimitive() && data.get(key).getAsJsonPrimitive().isBoolean() ? data.get(key).getAsBoolean() : fallback;
    }

    /**
     * Blocks with a block entity (containers, furnaces, signs, campfires, mod machines) are the player's property from the
     * host's point of view: content can read them, move items through them and change their state (a campfire goes out,
     * a candle is lit), but never replaces them with something else, breaks them or rewrites their data.
     */
    private static boolean property(BlockState state) { return state.hasBlockEntity(); }

    /** Places a block state (`minecraft:stone`, `minecraft:oak_stairs[facing=north]`). data: `replace` (bool, default false). */
    public static String placeBlock(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, String state, String data) {
        var actor = actor(combat, handle, controller); if (actor == null) return "actor-unavailable";
        var pos = pos(point); var level = actor.level();
        if (!loaded(level, pos)) return "unloaded";
        var current = level.getBlockState(pos);
        var options = object(data);
        if (options.has("expectedState") && !current.toString().equals(options.get("expectedState").getAsString())) return "state-changed";
        BlockState target;
        try { target = NativeBlockStates.parse(level.holderLookup(Registries.BLOCK), state, current); }
        catch (Exception malformed) { return "invalid-state"; }
        if (!current.canBeReplaced() && !flag(options, "replace", false)) return "occupied";
        if (current.getBlock().defaultDestroyTime() < 0) return "unbreakable";
        if (property(current) && !current.is(target.getBlock())) return "block-entity";
        if (actor.player() == null && !EventHooks.canEntityGrief(level, actor.entity())) return "protected-area";
        if (!level.mayInteract(actor.proxy(), pos)) return "protected-area";
        if (!level.isUnobstructed(target, pos, net.minecraft.world.phys.shapes.CollisionContext.empty()) && !flag(options, "force", false)) return "entity-in-the-way";
        var snapshot = BlockSnapshot.create(level.dimension(), level, pos);
        if (!level.setBlock(pos, target, net.minecraft.world.level.block.Block.UPDATE_ALL)) return "refused";
        if (EventHooks.onBlockPlace(actor.entity(), snapshot, Direction.UP)) { snapshot.restore(net.minecraft.world.level.block.Block.UPDATE_ALL); return "protected-area"; }
        level.gameEvent(actor.entity(), net.minecraft.world.level.gameevent.GameEvent.BLOCK_PLACE, pos);
        return "";
    }
    /** Breaks a block as the actor would; `drops` controls item drops. */
    public static String breakBlock(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, boolean drops) {
        var actor = actor(combat, handle, controller); if (actor == null) return "actor-unavailable";
        var pos = pos(point); var level = actor.level();
        if (!loaded(level, pos)) return "unloaded";
        var state = level.getBlockState(pos);
        if (state.isAir()) return "air";
        if (state.getBlock().defaultDestroyTime() < 0) return "unbreakable";
        if (property(state)) return "block-entity";
        if (actor.player() == null && !EventHooks.canEntityGrief(level, actor.entity())) return "protected-area";
        if (!level.mayInteract(actor.proxy(), pos)) return "protected-area";
        if (actor.proxy() instanceof ServerPlayer serverPlayer) {
            var event = CommonHooks.fireBlockBreak(level, serverPlayer.gameMode.getGameModeForPlayer(), serverPlayer, pos, state);
            if (event.isCanceled()) return "protected-area";
        }
        return level.destroyBlock(pos, drops, actor.entity()) ? "" : "refused";
    }
    /** Block entity data as JSON (`{}` when the block has none). */
    public static String blockData(MinecraftCombat combat, ActorHandle handle, Point point) {
        var entity = combat.resolve(handle); if (entity == null) return "";
        var level = (ServerLevel) entity.level(); var pos = pos(point);
        if (!loaded(level, pos)) return "";
        var block = level.getBlockEntity(pos);
        return block == null ? "{}" : NbtJson.read(block.saveWithoutMetadata(level.registryAccess()));
    }
    /** Merges JSON fields into a block entity's data. Containers (anything exposing an item handler) are refused: use insertItem/extractItem. */
    public static String setBlockData(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, String json) {
        var actor = actor(combat, handle, controller); if (actor == null) return "actor-unavailable";
        var pos = pos(point); var level = actor.level();
        if (!loaded(level, pos)) return "unloaded";
        var block = level.getBlockEntity(pos);
        if (block == null) return "no-block-entity";
        if (container(level, pos) != null) return "container";
        if (actor.player() == null && !EventHooks.canEntityGrief(level, actor.entity())) return "protected-area";
        if (!level.mayInteract(actor.proxy(), pos)) return "protected-area";
        var current = block.saveWithoutMetadata(level.registryAccess());
        var patch = NbtJson.write(json);
        if (!(patch instanceof net.minecraft.nbt.CompoundTag compound)) return "invalid-data";
        current.merge(compound);
        try { block.loadWithComponents(current, level.registryAccess()); }
        catch (RuntimeException failure) { return "refused"; }
        block.setChanged();
        level.sendBlockUpdated(pos, level.getBlockState(pos), level.getBlockState(pos), net.minecraft.world.level.block.Block.UPDATE_ALL);
        return "";
    }
    private static net.neoforged.neoforge.items.IItemHandler container(ServerLevel level, BlockPos pos) {
        return loaded(level, pos) ? level.getCapability(Capabilities.ItemHandler.BLOCK, pos, null) : null;
    }
    private static JsonObject stackJson(net.minecraft.core.HolderLookup.Provider access, ItemStack stack) {
        var json = new JsonObject();
        json.addProperty("item", stack.isEmpty() ? "" : BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
        json.addProperty("count", stack.getCount());
        String serialized = NativeRegistryFacts.serializeStack(access, stack);
        json.add("stack", serialized == null ? JsonNull.INSTANCE : JsonParser.parseString(serialized));
        return json;
    }
    /** Slots of a container block as `[{item,count}, ...]`; `[]` when the block holds no items. */
    public static String container(MinecraftCombat combat, ActorHandle handle, Point point) {
        var entity = combat.resolve(handle); if (entity == null) return "[]";
        var handler = container((ServerLevel) entity.level(), pos(point));
        if (handler == null) return "[]";
        var slots = new JsonArray();
        for (int slot = 0; slot < handler.getSlots(); slot++) slots.add(stackJson(entity.registryAccess(), handler.getStackInSlot(slot)));
        return slots.toString();
    }
    private static ItemStack stack(net.minecraft.core.HolderLookup.Provider access, String itemId, int count) {
        var stack = NativeRegistryFacts.parseStack(access, itemId);
        if (stack.isEmpty()) throw new IllegalArgumentException("Expected a nonempty item stack");
        return stack.copyWithCount(Math.max(1, Math.min(64, count)));
    }
    /** Inserts into a container block; returns the number actually accepted. */
    public static int insertItem(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, String itemId, int count) {
        var actor = actor(combat, handle, controller); if (actor == null) return 0;
        var pos = pos(point);
        if (!actor.level().mayInteract(actor.proxy(), pos)) return 0;
        var handler = container(actor.level(), pos);
        if (handler == null) return 0;
        var stack = stack(actor.level().registryAccess(), itemId, count);
        var remainder = ItemHandlerHelper.insertItem(handler, stack, false);
        return stack.getCount() - remainder.getCount();
    }
    /** Extracts from a container slot; returns `{item,count}` of what came out (`item` empty when nothing). */
    public static String extractItem(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, int slot, int count) {
        var actor = actor(combat, handle, controller); if (actor == null) return "{\"item\":\"\",\"count\":0,\"stack\":{}}";
        var pos = pos(point);
        var handler = actor.level().mayInteract(actor.proxy(), pos) ? container(actor.level(), pos) : null;
        if (handler == null || slot < 0 || slot >= handler.getSlots()) return stackJson(actor.level().registryAccess(), ItemStack.EMPTY).toString();
        return stackJson(actor.level().registryAccess(), handler.extractItem(slot, Math.max(1, Math.min(64, count)), false)).toString();
    }
    /** Drops an item entity; data: `pickupDelay` (ticks), `velocity` [x,y,z], `glow` (bool). Returns the entity UUID. */
    public static String dropItem(MinecraftCombat combat, ActorHandle handle, Point point, String itemId, int count, String data) {
        var entity = combat.resolve(handle); if (entity == null) return "";
        var level = (ServerLevel) entity.level();
        var options = object(data);
        var item = new ItemEntity(level, point.x(), point.y(), point.z(), stack(level.registryAccess(), itemId, count));
        if (options.has("pickupDelay")) item.setPickUpDelay(Math.max(0, Math.min(6000, options.get("pickupDelay").getAsInt())));
        else item.setDefaultPickUpDelay();
        if (options.has("velocity") && options.get("velocity").isJsonArray() && options.getAsJsonArray("velocity").size() == 3) {
            var v = options.getAsJsonArray("velocity");
            item.setDeltaMovement(new Vec3(v.get(0).getAsDouble(), v.get(1).getAsDouble(), v.get(2).getAsDouble()));
        }
        if (flag(options, "glow", false)) item.setGlowingTag(true);
        item.setThrower(entity);
        return level.addFreshEntity(item) ? item.getStringUUID() : "";
    }
    /** Gives items to a player's inventory; returns how many were taken (0 for anyone who is not a player). */
    public static int giveItem(MinecraftCombat combat, ActorHandle target, String itemId, int count) {
        var entity = combat.resolve(target);
        if (!(entity instanceof ServerPlayer player)) return 0;
        var stack = stack(player.registryAccess(), itemId, count); int requested = stack.getCount();
        player.getInventory().add(stack);
        player.containerMenu.broadcastChanges();
        return requested - stack.getCount();
    }
    /** Native blast and visuals without block damage/fire. Optional data.damage=false leaves health settlement to content. */
    public static boolean explode(MinecraftCombat combat, ActorHandle handle, Point point, double power, String data) {
        var entity = combat.resolve(handle); if (entity == null) return false;
        var level = (ServerLevel) entity.level();
        var options = com.google.gson.JsonParser.parseString(data).getAsJsonObject();
        boolean damage = !options.has("damage") || options.get("damage").getAsBoolean();
        float knockback = options.has("knockback") ? options.get("knockback").getAsFloat() : 1F;
        if (!Float.isFinite(knockback) || knockback < 0) throw new IllegalArgumentException("Invalid blast knockback multiplier");
        if (damage && !options.has("knockback"))
            level.explode(entity, point.x(), point.y(), point.z(), (float) Math.max(0.1, Math.min(8, power)), false, Level.ExplosionInteraction.NONE);
        else
            level.explode(entity, null, new net.minecraft.world.level.SimpleExplosionDamageCalculator(false, damage,
                java.util.Optional.of(knockback), java.util.Optional.empty()), point.x(), point.y(), point.z(),
                (float) Math.max(0.1, Math.min(8, power)), false, Level.ExplosionInteraction.NONE);
        return true;
    }
    /** Summons lightning: the flash, thunder and the strike itself. It never sets fire; native lightning damage is skipped too, content applies its own. */
    public static boolean lightning(MinecraftCombat combat, ActorHandle handle, UUID controller, Point point, boolean visualOnly) {
        var actor = actor(combat, handle, controller); if (actor == null) return false;
        var bolt = EntityType.LIGHTNING_BOLT.create(actor.level());
        if (bolt == null) return false;
        bolt.moveTo(point.x(), point.y(), point.z());
        bolt.setVisualOnly(true);
        if (actor.player() != null) bolt.setCause(actor.player());
        return actor.level().addFreshEntity(bolt);
    }
    public static boolean ignite(MinecraftCombat combat, ActorHandle target, int ticks) {
        var entity = combat.resolve(target); if (entity == null) return false;
        if (ticks <= 0) { entity.clearFire(); return true; }
        entity.igniteForTicks(Math.min(ticks, 6000)); return true;
    }
    /** Makes a mob hostile to a target (or calms it with null). Players and non-mobs cannot be directed. */
    public static boolean target(MinecraftCombat combat, ActorHandle handle, ActorHandle target) {
        var entity = combat.resolve(handle);
        if (!(entity instanceof Mob mob)) return false;
        var victim = target == null ? null : combat.resolve(target);
        if (target != null && victim == null) return false;
        mob.setTarget(victim);
        if (mob instanceof NeutralMob neutral) {
            if (victim != null) { neutral.setPersistentAngerTarget(victim.getUUID()); neutral.startPersistentAngerTimer(); }
            else neutral.stopBeingAngry();
        }
        return mob.getTarget() == victim;
    }
    /** Sets the level's weather; `weather` is clear | rain | thunder, `ticks` its duration. */
    public static boolean weather(MinecraftCombat combat, ActorHandle handle, String weather, int ticks) {
        var entity = combat.resolve(handle); if (entity == null) return false;
        var level = (ServerLevel) entity.level();
        int duration = Math.max(20, Math.min(ticks, 168000));
        switch (weather) {
            case "clear" -> level.setWeatherParameters(duration, 0, false, false);
            case "rain" -> level.setWeatherParameters(0, duration, true, false);
            case "thunder" -> level.setWeatherParameters(0, duration, true, true);
            default -> { return false; }
        }
        return true;
    }

    // --- raw native objects -------------------------------------------------------------------------

    /** Entities of every kind near a point; `type` narrows to one registered entity type id. */
    public static Object[] entities(MinecraftCombat combat, ActorHandle handle, Point centre, double radius, String type) {
        var entity = combat.resolve(handle); if (entity == null) return new Object[0];
        var level = (ServerLevel) entity.level();
        var box = new net.minecraft.world.phys.AABB(centre.x() - radius, centre.y() - radius, centre.z() - radius, centre.x() + radius, centre.y() + radius, centre.z() + radius);
        var wanted = type.isBlank() ? null : BuiltInRegistries.ENTITY_TYPE.getOptional(ResourceLocation.parse(type)).orElse(null);
        if (!type.isBlank() && wanted == null) return new Object[0];
        return level.getEntities((Entity) null, box, e -> e.isAlive() && !e.isSpectator() && (wanted == null || e.getType() == wanted)
            && e.position().distanceToSqr(centre.x(), centre.y(), centre.z()) <= radius * radius).toArray();
    }

    /**
     * Spawns any registered entity type at a point with optional NBT, as the acting identity would. Living spawns go
     * through the usual spawn checks and events; a positive `ticks` discards the entity when it runs out.
     */
    public static Object spawnEntity(MinecraftCombat combat, ActorHandle handle, UUID controller, String type, Point point, String nbt, int ticks) {
        var actor = actor(combat, handle, controller); if (actor == null) return null;
        var level = actor.level();
        var pos = pos(point);
        if (!loaded(level, pos)) return null;
        var entityType = BuiltInRegistries.ENTITY_TYPE.getOptional(ResourceLocation.parse(type)).orElse(null);
        if (entityType == null || entityType == EntityType.PLAYER) return null;
        var tag = NbtJson.write(nbt);
        var compound = tag instanceof net.minecraft.nbt.CompoundTag c ? c : new net.minecraft.nbt.CompoundTag();
        compound.putString("id", type);
        var spawned = EntityType.loadEntityRecursive(compound, level, e -> { e.moveTo(point.x(), point.y(), point.z(), e.getYRot(), e.getXRot()); return e; });
        if (spawned == null) return null;
        // Like /summon: a bare spawn gets the mob's random equipment and attributes, an NBT spawn keeps what it was given.
        if (spawned instanceof Mob mob && compound.size() == 1) EventHooks.finalizeMobSpawn(mob, level, level.getCurrentDifficultyAt(pos), MobSpawnType.MOB_SUMMONED, null);
        if (!level.tryAddFreshEntityWithPassengers(spawned)) return null;
        if (ticks > 0) combat.spawnedLifetimes.put(spawned.getUUID(), level.getGameTime() + ticks);
        return spawned;
    }
    static void tickSpawned(MinecraftCombat combat) {
        if (combat.spawnedLifetimes.isEmpty()) return;
        for (var iterator = combat.spawnedLifetimes.entrySet().iterator(); iterator.hasNext();) {
            var entry = iterator.next(); Entity found = null;
            for (var level : combat.server().getAllLevels()) { found = level.getEntity(entry.getKey()); if (found != null) { if (level.getGameTime() >= entry.getValue()) { found.discard(); iterator.remove(); } break; } }
            if (found == null) iterator.remove();
        }
    }
    static void stopSpawned(MinecraftCombat combat) {
        for (var id : List.copyOf(combat.spawnedLifetimes.keySet()))
            for (var level : combat.server().getAllLevels()) { var found = level.getEntity(id); if (found != null) found.discard(); }
        combat.spawnedLifetimes.clear();
    }
    /** Runs a command as the controlling player at the actor's position, or as the server console when nobody controls; returns the command's result value. */
    public static int command(MinecraftCombat combat, ActorHandle handle, UUID controller, String command) {
        var actor = actor(combat, handle, controller); if (actor == null) return 0;
        var server = combat.server();
        int[] result = new int[1];
        var stack = (actor.player() != null ? actor.player().createCommandSourceStack() : server.createCommandSourceStack())
            .withPosition(actor.entity().position()).withLevel(actor.level()).withSuppressedOutput().withCallback((success, value) -> result[0] = value);
        server.getCommands().performPrefixedCommand(stack, command);
        return result[0];
    }
}
