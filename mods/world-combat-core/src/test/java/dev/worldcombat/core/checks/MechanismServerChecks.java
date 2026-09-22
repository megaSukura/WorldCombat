package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.animal.Cow;
import net.minecraft.world.level.block.Blocks;

/** A consolidated real-world batch for the P4 capabilities and a core-only scripted brain. */
public final class MechanismServerChecks {
    private static int age;
    private static boolean done;
    private static Cow actor, target, ally;
    private static ActorHandle a, b, c;
    private static long portable;
    private static WorldAccess world(MinecraftCombat combat, ActorHandle source) {
        return new WorldAccess(combat.runtime(), source, null, () -> {}, true, 0);
    }
    public static void tick(MinecraftServer server) {
        if (done || !CombatServices.CONTENT.ready()) return;
        var combat = CombatServices.get(server); var runtime = combat.runtime(); var level = server.overworld();
        try {
            switch (age++) {
                case 0 -> {
                    TestWorld.prepare(server);
                    actor = TestWorld.mob(EntityType.COW, level, 2); target = TestWorld.mob(EntityType.COW, level, 6); ally = TestWorld.mob(EntityType.COW, level, 13);
                    a = combat.bind(actor); b = combat.bind(target); c = combat.bind(ally);
                    var team = server.getScoreboard().getPlayerTeam("p4-friendly");
                    if (team == null) team = server.getScoreboard().addPlayerTeam("p4-friendly");
                    server.getScoreboard().addPlayerToTeam(actor.getScoreboardName(), team); server.getScoreboard().addPlayerToTeam(ally.getScoreboardName(), team);
                    runtime.start("examples:beam", a, b, null);
                }
                case 30 -> {
                    TestWorld.require(Math.abs(target.getHealth() - 2) < 0.01, "Repeated beam strikes were lost to invulnerability frames: " + target.getHealth());
                    TestWorld.clean(combat); target.setHealth(10);
                    runtime.start("examples:beam", c, b, null);
                }
                case 39 -> {
                    TestWorld.require(runtime.busy(c), "Channel did not retain its action opportunity");
                    world(combat, b).deliver(c, "world_combat:interrupt");
                    TestWorld.require(!runtime.busy(c) && runtime.cooldown(c, "examples:beam") > 0, "Interruption bypassed commitment or retained channel");
                    portable = world(combat, a).effect("world_combat:wet", a, "{}", 100);
                    world(combat, a).operation(portable, "world_combat:transfer", "{\"target\":\"" + c.ref() + "\"}");
                    TestWorld.require(runtime.effects().query(a, "world_combat:wet").length == 0 && runtime.effects().query(c, "world_combat:wet").length == 1, "Portable effect did not transfer");
                    combat.left(actor);
                    TestWorld.require(runtime.effects().query(c, "world_combat:wet").length == 1, "Transferred effect retained its old source lifecycle");
                    a = combat.bind(actor);
                    target.setHealth(10); target.moveTo(12, 100, 2);
                    runtime.start("examples:snare", a, ActionTarget.point(new Point(8, 100.4, 2), new Point(1,0,0)), null);
                }
                case 50 -> target.moveTo(8, 100, 2);
                case 58 -> {
                    TestWorld.require(runtime.effects().query(b, "world_combat:rooted").length > 0, "Entering a field did not trigger its script rule");
                    TestWorld.require(target.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.MOVEMENT_SPEED) == 0, "Root did not restrict the native movement attribute");
                    target.moveTo(12, 100, 2);
                    runtime.start("examples:decoy", a, ActionTarget.point(new Point(5, 100, 4), new Point(1,0,0)), null);
                }
                case 65 -> {
                    TestWorld.require(combat.helpers().count() == 1, "Temporary helper was not created");
                    TestWorld.require(world(combat, b).heard(0, 16).length > 0, "Sound observation did not expose its bounded position");
                    world(combat, a).effect("world_combat:reflect", a, "{}", 30);
                    actor.setHealth(10); target.setHealth(10);
                    combat.damage(b, a, null, 4, "{}");
                    TestWorld.require(Math.abs(actor.getHealth() - 8) < 0.01 && Math.abs(target.getHealth() - 8) < 0.01, "Reflection did not resolve once on each participant");
                    var helper = world(combat, a).query(new Point(5,100.4,4), 1, false)[0];
                    world(combat, a).effect("world_combat:redirect", a, "{\"recipient\":\"" + helper.ref() + "\"}", 20);
                    combat.damage(b, a, null, 2, "{}");
                    TestWorld.require(Math.abs(actor.getHealth() - 8) < 0.01 && Math.abs(combat.resolve(helper).getHealth() - 10) < 0.01, "Substitute damage was not redirected");
                    combat.left(actor);
                }
                case 68 -> {
                    TestWorld.require(combat.helpers().count() == 0, "Actor departure retained a helper");
                    a = combat.bind(actor);
                    var cells = "{\"cells\":[{\"x\":4,\"y\":100,\"z\":4,\"block\":\"minecraft:stone\"}],\"replace\":true}";
                    level.setBlockAndUpdate(new BlockPos(4,100,4), Blocks.DIRT.defaultBlockState());
                    combat.effects().place(432, a, null, cells, 15);
                    var rock = new BlockPos(5,100,4); level.setBlockAndUpdate(rock, Blocks.DIRT.defaultBlockState());
                    combat.effects().place(432, a, null, "{\"cells\":[{\"x\":5,\"y\":100,\"z\":4,\"block\":\"world_combat_core:temporary_rock\"}],\"replace\":true}", 15);
                    TestWorld.require(level.getBlockState(new BlockPos(4,100,4)).is(Blocks.STONE), "Generic terrain placement failed");
                    var obstructed = world(combat, a).teleport(a, new Point(4,100,4));
                    TestWorld.require(!obstructed, "Teleport ignored block collision");
                }
                case 86 -> {
                    TestWorld.require(level.getBlockState(new BlockPos(4,100,4)).is(Blocks.DIRT), "Terrain expiry did not restore the owned cell");
                    TestWorld.require(level.getBlockState(new BlockPos(5,100,4)).is(Blocks.DIRT), "Temporary rock removed the previous terrain before lease restoration");
                    TestWorld.require(runtime.effects().query(b, "world_combat:rooted").length == 0, "Leaving a trap retained root beyond its duration");
                    TestWorld.require(target.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.MOVEMENT_SPEED) > 0, "Root expiry did not restore native movement");
                    target.setHealth(10); target.moveTo(8,100,2); target.addTag("wc_p4_target");
                    actor.moveTo(2,100,2); actor.addTag("wc_p4_brain"); actor.setNoAi(false);
                }
                case 121 -> {
                    TestWorld.require(CombatServices.CONTENT.get("examples:beam") != null && !runtime.busy(a)
                        && target.getHealth() <= 2.01, "Core-only AI did not complete its multi-strike action: health=" + target.getHealth());
                    actor.removeTag("wc_p4_brain"); runtime.reset("batch-cleanup");
                    TestWorld.require(!combat.controls(actor) && combat.helpers().count() == 0 && combat.effects().count() == 0 && combat.attributes().count() == 0, "Reset retained owned world resources");
                    verifyChunkDeparture(server, combat);
                    TestWorld.clean(combat); done = true;
                    System.out.println("P4CHECK PASS mechanisms: multi-hit, channel interruption, transfer, fields, decoy, sound, reflection, redirect, terrain, teleport and core-only AI");
                }
            }
        } catch (Throwable error) { done = true; error.printStackTrace(); System.out.println("P4CHECK FAIL mechanisms age=" + age + " " + error); }
    }
    private static void verifyChunkDeparture(MinecraftServer server, MinecraftCombat combat) throws ReflectiveOperationException {
        var level = server.overworld(); var chunk = new net.minecraft.world.level.ChunkPos(2, 0);
        level.getChunk(chunk.x, chunk.z);
        var field = net.minecraft.server.level.ServerLevel.class.getDeclaredField("entityManager"); field.setAccessible(true);
        var manager = (net.minecraft.world.level.entity.PersistentEntitySectionManager<?>) field.get(level);
        manager.updateChunkStatus(chunk, net.minecraft.world.level.entity.Visibility.TICKING);
        var source = TestWorld.mob(EntityType.COW, level, 35); source.setNoGravity(true);
        var handle = combat.bind(source);
        var recipient = TestWorld.mob(EntityType.COW, level, 39);
        var owner = combat.runtime().start("checks:hold", handle, combat.bind(recipient), null);
        TestWorld.require(combat.runtime().busy(handle), "Helper fixture did not retain its action owner");
        var helper = combat.helpers().create(owner, handle, new Point(37,100,4), 10, "{}", 100);
        var body = combat.resolve(helper);
        TestWorld.require(body instanceof HelperActor && !body.shouldBeSaved(), "Temporary helper entered persistent entity storage");
        // This is the native section traversal which previously removed a second entity from its own live iterator.
        manager.updateChunkStatus(chunk, net.minecraft.world.level.entity.Visibility.HIDDEN);
        TestWorld.require(!combat.valid(handle) && !combat.valid(helper) && !combat.controls(source), "Departure did not immediately invalidate actor access");
        TestWorld.require(!body.isRemoved(), "Tracking callback mutated the live helper section");
        combat.tick();
        TestWorld.require(combat.helpers().count() == 0, "Host boundary retained departed helper ownership");
        TestWorld.require(body.isRemoved(), "Deferred helper removal was not drained at the safe boundary");
        manager.updateChunkStatus(chunk, net.minecraft.world.level.entity.Visibility.TICKING);
        source.discard(); recipient.discard();
        var orphan = CombatWorldContent.HELPER.get().create(level);
        TestWorld.require(orphan != null, "Helper type missing");
        orphan.moveTo(37,100,4); level.addFreshEntity(orphan); orphan.tick();
        TestWorld.require(orphan.isRemoved(), "A helper recovered without a runtime owner remained in the world");
        System.out.println("P4CHECK native chunk-section departure releases temporary bodies without mutating its live iterator or persisting helpers");
    }
}
