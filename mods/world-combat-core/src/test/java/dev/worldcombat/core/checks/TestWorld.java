package dev.worldcombat.core.checks;

import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.*;
import net.minecraft.world.level.GameRules;
import net.minecraft.world.level.block.Blocks;
import dev.worldcombat.core.world.*;

public final class TestWorld {
    private TestWorld() {}
    public static ServerLevel prepare(MinecraftServer server) {
        var level = server.overworld();
        level.setChunkForced(0, 0, true);
        server.getGameRules().getRule(GameRules.RULE_DOMOBSPAWNING).set(false, server);
        for (int x = 0; x < 16; x++) for (int z = 0; z < 6; z++) {
            level.setBlockAndUpdate(new BlockPos(x, 99, z), Blocks.STONE.defaultBlockState());
            for (int y = 100; y < 104; y++) level.setBlockAndUpdate(new BlockPos(x, y, z), Blocks.AIR.defaultBlockState());
        }
        level.getEntitiesOfClass(Mob.class, new net.minecraft.world.phys.AABB(0, 99, 0, 16, 105, 6)).forEach(Entity::discard);
        return level;
    }
    public static <T extends Mob> T mob(EntityType<T> type, ServerLevel level, double x) {
        var entity = type.create(level);
        if (entity == null) throw new AssertionError("Entity could not be created");
        entity.setNoAi(true); entity.setNoGravity(true); entity.setPersistenceRequired();
        entity.moveTo(x, 100, 2, 0, 0);
        if (!level.addFreshEntity(entity)) throw new AssertionError("Entity could not be added");
        return entity;
    }
    public static void wall(ServerLevel level, boolean enabled) {
        for (int y = 100; y < 104; y++) for (int z = 0; z < 5; z++)
            level.setBlockAndUpdate(new BlockPos(5, y, z),
                (enabled ? Blocks.STONE : Blocks.AIR).defaultBlockState());
    }
    public static void clean(MinecraftCombat service) {
        var stats = service.runtime().stats();
        require(stats.instances() == 0 && stats.tasks() == 0 && stats.listeners() == 0, "Transient scopes remained: " + stats);
    }
    public static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    @SuppressWarnings("unchecked")
    public static AutoCloseable mockOwner(MinecraftServer server, net.minecraft.server.level.ServerPlayer player) throws Exception {
        // Test-only UUID lookup: FakePlayer has a no-op connection and is not added
        // to the network or player tick list. The production jars exclude this class.
        var field = net.minecraft.server.players.PlayerList.class.getDeclaredField("playersByUUID");
        field.setAccessible(true);
        var players = (java.util.Map<java.util.UUID, net.minecraft.server.level.ServerPlayer>) field.get(server.getPlayerList());
        if (players.putIfAbsent(player.getUUID(), player) != null) throw new AssertionError("Duplicate mock owner");
        return () -> players.remove(player.getUUID(), player);
    }
    public static void mark(String message) { System.out.println("P1CHECK " + message); }
}
