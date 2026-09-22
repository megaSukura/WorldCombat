package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.animal.Cow;
import net.minecraft.world.level.block.Blocks;

public final class WorldEffectChecks {
    private static int age;
    private static boolean done;
    private static Cow actor, target;
    private static ActorHandle handle;
    private static final Point WALL = new Point(6, 100, 2);
    private static final Point DIRECTION = new Point(1, 0, 0);
    public static void tick(MinecraftServer server) {
        if (done || !CombatServices.CONTENT.ready()) return;
        var combat = CombatServices.get(server);
        var level = server.overworld();
        try {
            switch (age++) {
                case 0 -> {
                    TestWorld.prepare(server);
                    actor = TestWorld.mob(EntityType.COW, level, 2);
                    target = TestWorld.mob(EntityType.COW, level, 11);
                    handle = combat.bind(actor);
                    combat.runtime().start("world_combat:ward", handle, handle, null);
                    TestWorld.require(combat.runtime().effects().query(handle, "world_combat:shield").length == 1, "Ward was not attached");
                    TestWorld.require(actor.hurt(actor.damageSources().generic(), 4), "Ward damage rejected");
                    TestWorld.require(actor.getHealth() == 8, "Ward did not halve damage: " + actor.getHealth());
                    combat.runtime().cancelActor(handle, "test-cancel");
                    TestWorld.require(combat.runtime().effects().query(handle, "world_combat:shield").length == 0 && !actor.hasEffect(CombatWorldContent.WARD), "Ward survived cancellation");
                    actor.invulnerableTime = 0;
                    actor.hurt(actor.damageSources().generic(), 4);
                    TestWorld.require(actor.getHealth() == 4, "Damage reduction survived its action");
                    actor.setHealth(actor.getMaxHealth());
                    System.out.println("P2CHECK core ward, real damage and cancellation passed");
                }
                case 5 -> combat.runtime().start("world_combat:wall", handle, ActionTarget.point(WALL, DIRECTION), null);
                case 20 -> {
                    var cells = CombatGeometry.cells(CombatServices.CONTENT.preview("world_combat:wall"), WALL, DIRECTION);
                    TestWorld.require(cells.stream().allMatch(p -> level.getBlockEntity(p) instanceof TemporaryRock.Lease), "Wall geometry differs");
                    TestWorld.clean(combat);
                    TestWorld.require(combat.effects().count() == 1, "Finished placement lost its actor-bound terrain");
                    var saved = level.getBlockEntity(cells.get(2)).saveWithFullMetadata(server.registryAccess());
                    var restored = net.minecraft.world.level.block.entity.BlockEntity.loadStatic(cells.get(2),
                        CombatWorldContent.ROCK.get().defaultBlockState(), saved, server.registryAccess());
                    TestWorld.require(restored instanceof TemporaryRock.Lease && saved.hasUUID("Effect") && saved.hasUUID("Actor") && saved.getLong("Expiry") > level.getGameTime(), "Native block lease persistence failed");
                    level.setBlockAndUpdate(cells.get(0), Blocks.STONE.defaultBlockState());
                    level.destroyBlock(cells.get(1), true);
                    combat.runtime().start("world_combat:bolt", handle, combat.bind(target), null);
                }
                case 55 -> {
                    TestWorld.require(target.getHealth() == 10, "Projectile crossed solid temporary terrain");
                    combat.runtime().start("world_combat:dash", handle,
                        ActionTarget.point(new Point(7.8, combat.position(handle).y(), 2), DIRECTION), null);
                }
                case 78 -> {
                    TestWorld.require(actor.getX() > 2.5 && actor.getX() < 6, "Dash ignored collision or did not move: " + actor.getX());
                    TestWorld.require(CombatServices.CONTENT.get("world_combat:dash") != null, "Expected obstruction disabled the script");
                    TestWorld.clean(combat);
                    System.out.println("P2CHECK core shared wall geometry, native lease NBT, projectile and dash collision passed");
                }
                case 185 -> {
                    var cells = CombatGeometry.cells(CombatServices.CONTENT.preview("world_combat:wall"), WALL, DIRECTION);
                    TestWorld.require(level.getBlockState(cells.get(0)).is(Blocks.STONE), "Expiry removed the player's replacement");
                    for (int i = 1; i < cells.size(); i++) TestWorld.require(level.getBlockState(cells.get(i)).isAir(), "Expired owned cell remained");
                    TestWorld.require(combat.effects().count() == 0, "Expired wall kept its scope");
                    TestWorld.require(level.getEntitiesOfClass(net.minecraft.world.entity.item.ItemEntity.class,
                        new net.minecraft.world.phys.AABB(4, 99, 0, 8, 104, 5)).isEmpty(), "Temporary terrain dropped an item");
                    combat.runtime().start("world_combat:wall", handle, ActionTarget.point(new Point(10, 100, 4), DIRECTION), null);
                }
                case 200 -> {
                    TestWorld.require(combat.effects().count() == 1, "Departure fixture did not create its wall");
                    combat.left(actor);
                }
                case 202 -> {
                    TestWorld.require(combat.effects().count() == 0, "Actor departure retained terrain");
                    for (var pos : CombatGeometry.cells(CombatServices.CONTENT.preview("world_combat:wall"), new Point(10, 100, 4), DIRECTION))
                        TestWorld.require(level.getBlockState(pos).isAir(), "Actor departure retained a placed cell");
                    // Persist untracked leases, as encountered after reloading a chunk or recovering a stopped process.
                    for (int z = 3; z <= 4; z++) {
                        var pos = new BlockPos(14, 100, z);
                        level.setBlockAndUpdate(pos, CombatWorldContent.ROCK.get().defaultBlockState());
                        ((TemporaryRock.Lease) level.getBlockEntity(pos)).initialize(java.util.UUID.randomUUID(),
                            z == 3 ? actor.getUUID() : java.util.UUID.randomUUID(), level.getGameTime() + 100);
                    }
                    server.saveEverything(true, true, true);
                    done = true;
                    System.out.println("P2CHECK PASS core world effects: damage, interruption, geometry, collision, expiry, construction preservation and actor departure");
                }
            }
        } catch (Throwable error) {
            done = true; error.printStackTrace();
            System.out.println("P2CHECK FAIL core world effects tick=" + age + " " + error);
        }
    }
}
