package dev.worldcombat.core.runtime;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.effect.EffectData;
import java.util.*;

/** Neutral provenance/state lifetime checks; no authored skills or native game process. */
public final class ExecutionOriginChecks {
    public static void run() {
        var actors = new HashSet<ActorHandle>(); var damage = new ArrayList<String>();
        var actor = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        var victim = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        actors.add(actor); actors.add(victim);
        CombatHost host = new CombatHost() {
            public boolean valid(ActorHandle handle) { return actors.contains(handle); }
            public boolean mayAct(ActorHandle handle, UUID controller) { return valid(handle); }
            public Point position(ActorHandle handle) { return new Point(handle.equals(victim) ? 2 : 0, 0, 0); }
            public Impact trace(ActorHandle source, UUID controller, Point from, Point to, double radius) { return new Impact(to, victim, false); }
            public boolean damage(ActorHandle source, ActorHandle target, UUID controller, double amount) { return true; }
            public boolean damage(ActorHandle source, ActorHandle target, UUID controller, double amount, String data) { damage.add(data); return true; }
            public void particle(ActorHandle source, Point point) {}
            public void report(long id, String content, String message, Throwable error) { if (error != null) throw new AssertionError(message, error); }
        };
        var content = new ContentRegistry(); var runtime = new ActionRuntime(host, content);
        content.begin(); var epoch = content.epoch(); var effects = content.effects();
        String[] origin = { "" }; int[] later = { 0 };
        effects.effect(epoch, "checks:derived", 1, 40, "actor", EffectData::copy, (version, data) -> data);
        effects.effect(epoch, "checks:nested", 1, 40, "actor", EffectData::copy, (version, data) -> data);
        effects.handler(epoch, "checks:derived", "start", effect -> effect.schedule("late", "late", 1, "{}"));
        effects.handler(epoch, "checks:derived", "late", effect -> {
            var world = effect.world();
            check(world.originInstance().equals(origin[0]) && world.originData("checks:grant").equals("true"), "Derived effect lost ended action provenance/state");
            world.originData("checks:grant", "false");
            world.effect("checks:nested", victim, "{}", 5);
            world.hurt(victim, 2, "{\"action\":999,\"originInstance\":\"forged\"}");
            later[0]++; effect.end();
        });
        effects.handler(epoch, "checks:derived", "end", effect -> check(effect.world().originInstance().equals(origin[0]), "End handler lost its execution origin"));
        effects.handler(epoch, "checks:nested", "start", effect -> {
            check(effect.world().originInstance().equals(origin[0]) && effect.world().originData("checks:grant").equals("false"), "Nested effect copied state instead of sharing origin");
        });
        content.hooks().register(epoch, "checks:observe", "checks:observe", "", event -> {
            check(event.world().originInstance().equals("native:fixture"), "Native delivery scope lost host origin");
            boolean blocked = false;
            try { event.world().originData("checks:grant", "true"); } catch (IllegalStateException expected) { blocked = true; }
            check(blocked, "Read-only origin state was writable");
        });
        content.register(epoch, "checks:origin", "fixture", 20, action -> {
            action.commit(1); origin[0] = action.world().originInstance();
            action.world().originData("checks:grant", "true");
            String large = "\"" + "x".repeat(20000) + "\"";
            String many = "[" + "0,".repeat(5000) + "0]";
            String deep = "{\"next\":".repeat(48) + "0" + "}".repeat(48);
            for (var json : List.of(large, many, deep)) {
                action.world().originData("checks:unbounded", json);
                check(action.world().originData("checks:unbounded").equals(json), "Execution state reintroduced an artificial size/structure cap");
            }
            action.world().effect("checks:derived", victim, "{}", 20);
            action.finish();
        });
        content.complete(true);
        runtime.start("checks:origin", actor, victim, null); runtime.tick();
        check(later[0] == 1 && damage.size() == 1, "Deferred fixture did not run after action completion");
        var metadata = JsonParser.parseString(damage.get(0)).getAsJsonObject();
        check(metadata.get("originInstance").getAsString().equals(origin[0]) && metadata.get("action").getAsLong() != 999,
            "Script payload forged the host execution identity");
        runtime.event("checks:observe", actor, victim, "{}", false, new ExecutionOrigin("native:fixture", actor, 0));
        runtime.stop();
        System.out.println("PASS execution origin: deferred/nested/end state, host attribution and read-only scope");
    }
    private static void check(boolean valid, String message) { if (!valid) throw new AssertionError(message); }
}
