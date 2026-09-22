package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.*;
import java.util.*;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.ai.attributes.Attributes;

public final class WorkshopServerChecks {
    private static int age; private static boolean done;
    private static Mob actor, first, second, third, listener;
    private static ActorHandle a, b, c, d;
    private static WorldAccess world(MinecraftCombat combat) { return new WorldAccess(combat.runtime(), a, null, () -> {}, true, 0); }
    public static String input(long token, double... xs) {
        var values = new ArrayList<String>(); for (double x : xs) values.add("{\"kind\":\"point\",\"point\":[" + x + ",100.3,2]}");
        return "{\"version\":1,\"token\":" + token + ",\"samples\":[" + String.join(",", values) + "]}";
    }
    private static void cast(MinecraftCombat combat, String id, String input, double x) {
        combat.runtime().start(id, a, ActionTarget.point(new Point(x,100.3,2), new Point(1,0,0)), null, input.equals("{}") ? Map.of() : Map.of(ActionInput.KEY, input));
    }
    public static void tick(MinecraftServer server) {
        if (done || !CombatServices.CONTENT.ready()) return;
        var combat = CombatServices.get(server); var runtime = combat.runtime();
        try {
            switch (age++) {
                case 0 -> {
                    var level = TestWorld.prepare(server);
                    TestWorld.require(CombatServices.CONTENT.get("world_combat:training_bolt") == null && CombatServices.CONTENT.get("examples:beam") == null, "Old skill content remained installed");
                    actor = TestWorld.mob(EntityType.COW, level, 2); first = TestWorld.mob(EntityType.COW, level, 6);
                    second = TestWorld.mob(EntityType.COW, level, 9); third = TestWorld.mob(EntityType.COW, level, 12);
                    for (var mob : List.of(first, second, third)) { mob.getAttribute(Attributes.MAX_HEALTH).setBaseValue(100); mob.setHealth(100); mob.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(1); }
                    a = combat.bind(actor); b = combat.bind(first); c = combat.bind(second); d = combat.bind(third);
                    for (var block : List.of("minecraft:chest", "minecraft:water", "minecraft:fire", "minecraft:sand")) {
                        try { combat.effects().place(100, a, null, "{\"cells\":[{\"x\":14,\"y\":100,\"z\":5,\"block\":\"" + block + "\"}]}", 20); throw new AssertionError("Unsupported block accepted: " + block); }
                        catch (ActionRejectedException expected) { TestWorld.require(expected.reason().equals("unsupported-terrain"), "Unexpected terrain refusal"); }
                    }
                    cast(combat, "p4:rain_path", input(0, 6, 9, 12), 12);
                }
                case 10 -> {
                    TestWorld.require(runtime.effects().query(a, "p4:conduit").length == 3, "Three-point path did not place its fields");
                    TestWorld.require(runtime.effects().query(c, "world_combat:wet").length > 0, "Conduit did not compose with wet");
                    world(combat).effect("world_combat:insulated", d, "{}", 80);
                    cast(combat, "p4:current", input(9, 6), 6);
                }
                case 14 -> TestWorld.require(runtime.control(a, null, 9, input(9,6), false), "Fresh sustained input rejected");
                case 17 -> {
                    TestWorld.require(!runtime.control(a, UUID.randomUUID(), 9, "{}", true), "Foreign controller stopped the action");
                    TestWorld.require(!runtime.control(a, null, 8, "{}", true), "Old token stopped a newer action");
                    TestWorld.require(runtime.control(a, null, 9, "{}", true), "Release did not stop the action");
                    TestWorld.require(first.getHealth() == 94 && second.getHealth() == 94 && third.getHealth() == 100, "Wet propagation or insulation failed: " + first.getHealth() + "/" + second.getHealth() + "/" + third.getHealth());
                    TestWorld.require(!runtime.control(a, null, 9, input(9,6), false), "Finished input resurrected an action");
                }
                case 25 -> {
                    var field = runtime.effects().query(a, "p4:conduit")[0];
                    String input = "{\"version\":1,\"token\":0,\"samples\":[{\"kind\":\"field\",\"ref\":\"" + a.ref() + "\",\"effect\":" + field.id() + ",\"point\":[6,100.3,2]},{\"kind\":\"point\",\"point\":[14,100.3,2]}]}";
                    cast(combat, "p4:link", input, 14);
                    TestWorld.require(runtime.effects().state(field.id()).contains("charged"), "Selected field was not modified");
                    try { runtime.start("p4:link", b, ActionTarget.point(new Point(14,100.3,2), new Point(1,0,0)), null, Map.of(ActionInput.KEY, input)); throw new AssertionError("Foreign field operation accepted"); }
                    catch (ActionRejectedException expected) { TestWorld.require(expected.reason().equals("effect-not-owned"), "Wrong field refusal"); }
                    TestWorld.require(combat.presentations().size() >= 4, "Authoritative presentation geometry missing");
                }
                case 40 -> {
                    listener = TestWorld.mob(EntityType.COW, server.overworld(), 2); listener.moveTo(2,100,4); listener.setNoAi(false); listener.setNoGravity(false); listener.addTag("wc_p4_listener");
                    cast(combat, "p4:echo_cast", "{}", 8);
                }
                case 60 -> {
                    var effects = runtime.effects().query(combat.bind(listener), "p4:listener");
                    TestWorld.require(effects.length == 1 && effects[0].data().contains("heard"), "New sound content did not drive the replacement AI memory");
                    TestWorld.require(listener.getX() > 2.1, "Sound-following AI did not use native navigation: " + listener.position() + " " + effects[0].data());
                    TestWorld.require(combat.helpers().count() == 1, "Sound helper missing");
                    cast(combat, "p4:current", input(15,6), 6);
                }
                case 78 -> {
                    TestWorld.require(!runtime.busy(a) && runtime.state(a).reason().equals("input-timeout"), "Lost input heartbeat did not stop channel");
                    listener.removeTag("wc_p4_listener"); runtime.reset("workshop-cleanup");
                    TestWorld.require(combat.presentations().size() == 0 && combat.helpers().count() == 0 && runtime.effects().stats().active() == 0, "Replacement content retained owned resources");
                    TestWorld.clean(combat); done = true;
                    System.out.println("P4CHECK PASS workshop: replacement profile, path, wet conduction, insulation, field selection/ownership, sustained update/stop/timeout, sound AI, bounded terrain and presentation cleanup");
                }
            }
        } catch (Throwable error) { done = true; error.printStackTrace(); System.out.println("P4CHECK FAIL workshop age=" + age + " " + error); }
    }
}
