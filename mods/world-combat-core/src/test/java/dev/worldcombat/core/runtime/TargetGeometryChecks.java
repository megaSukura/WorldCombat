package dev.worldcombat.core.runtime;

import java.util.*;

/** Neutral body-volume targets: range, precise aim, resizing, children and forged/stale selections. */
public final class TargetGeometryChecks {
    public static void run() {
        var source = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        var target = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        var far = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        var boxes = new HashMap<ActorHandle, BodyBounds>();
        boxes.put(source, new BodyBounds(new Point(0, 1, 0), new Point(0, 1, 0)));
        boxes.put(target, new BodyBounds(new Point(2, 0, -1), new Point(6, 10, 1)));
        boxes.put(far, new BodyBounds(new Point(30, 0, -1), new Point(36, 10, 1)));
        CombatHost host = new CombatHost() {
            public boolean valid(ActorHandle actor) { return boxes.containsKey(actor); }
            public boolean mayAct(ActorHandle actor, UUID controller) { return valid(actor); }
            public Point position(ActorHandle actor) { return bounds(actor).at(new Point(.5, .5, .5)); }
            public BodyBounds bounds(ActorHandle actor) { return boxes.get(actor); }
            public ActorHandle actorNear(ActorHandle actor, UUID id) { return boxes.keySet().stream().filter(it -> it.entity().equals(id)).findFirst().orElse(null); }
            public boolean friendly(ActorHandle actor, ActorHandle other) { return other.equals(target) || actor.equals(other); }
            public Impact trace(ActorHandle actor, UUID controller, Point from, Point to, double radius) { return new Impact(to, null, false); }
            public boolean damage(ActorHandle actor, ActorHandle other, UUID controller, double amount) { return false; }
            public void particle(ActorHandle actor, Point point) {}
            public void report(long id, String content, String message, Throwable error) { if (error != null) throw new AssertionError(message, error); }
        };
        var content = new ContentRegistry(); var runtime = new ActionRuntime(host, content);
        content.begin(); ActionContext[] held = { null }; Point[] childPoint = { null };
        content.registerAction(content.epoch(), "checks:aim", "1", 20, "*", "aim", 3, action -> held[0] = action);
        content.registerAction(content.epoch(), "checks:child", "1", 20, "*", "aim", 3, action -> { childPoint[0] = action.targetPosition(); action.finish(); });
        content.registerAction(content.epoch(), "checks:enemy", "1", 20, "*", "enemy", 3, ActionContext::finish);
        content.composition(content.epoch(), "checks:aim", "{\"mode\":\"parallel\",\"claims\":[]}");
        content.composition(content.epoch(), "checks:child", "{\"mode\":\"parallel\",\"claims\":[]}");
        content.complete(true);
        var direction = new Point(1, 0, 0); var foot = new Point(2, .2, 0);
        runtime.start("checks:aim", source, ActionTarget.entity(target, foot, direction), null);
        check(held[0].target().equals(target) && held[0].targetPosition().equals(foot), "Body-surface aim lost identity or precise point");
        boxes.put(target, new BodyBounds(new Point(2, 0, -2), new Point(10, 20, 2)));
        var resized = new Point(2, .4, 0);
        check(held[0].targetPosition().equals(resized), "Aim did not scale with the real body");
        held[0].commit(0);
        check(held[0].child("checks:child", target, resized, direction, "{}", "independent").accepted(), "Child lost the selected body point");
        check(resized.equals(childPoint[0]), "Child redirected to the body centre");
        held[0].releaseTarget(); boxes.remove(target);
        check(held[0].targetPosition().equals(resized), "Released target failed to freeze the latest body point");
        held[0].finish();
        boxes.put(target, new BodyBounds(new Point(2, 0, -2), new Point(10, 20, 2)));
        runtime.start("checks:aim", source, ActionTarget.entity(target, host.position(target), direction), null);
        check(held[0].targetPosition().equals(host.position(target)), "Default centre aim changed"); held[0].finish();
        rejects("out-of-range", () -> runtime.validateInput("checks:aim", source, ActionTarget.entity(far, new Point(0, 1, 0), direction), null));
        rejects("choose-enemy", () -> runtime.validateInput("checks:enemy", source, ActionTarget.entity(target, foot, direction), null));
        rejects("out-of-range", () -> runtime.validateInput("checks:aim", source, ActionTarget.point(new Point(30, 1, 0), direction), null));
        runtime.start("checks:aim", source, ActionTarget.point(foot, direction), null);
        check(held[0].target() == null && held[0].targetPosition().equals(foot), "Point aim inherited body semantics"); held[0].finish();
        var spec = new ActionInput.Spec(List.of("entity"), false);
        String sample = "{\"version\":1,\"token\":0,\"samples\":[{\"kind\":\"entity\",\"ref\":\"" + target.ref() + "\",\"point\":[0,0,0]}]}";
        var normalized = ActionInput.validate(sample, spec, 3, source, host, runtime.effects());
        check(normalized.samples().getFirst().point().equals(new Point(2, 0, 0)), "Selection retained a forged point outside its body");
        rejects("target-left", () -> ActionInput.validate(sample.replace(target.ref(), target.entity() + "/999"), spec, 3, source, host, runtime.effects()));
        rejects("out-of-range", () -> ActionInput.validate(sample.replace(target.ref(), far.ref()), spec, 3, source, host, runtime.effects()));
        runtime.stop();
        System.out.println("PASS target geometry: surface reach, precise/resized/child aim, point inputs, allegiance and forged/stale selections");
    }
    private static void check(boolean valid, String message) { if (!valid) throw new AssertionError(message); }
    private static void rejects(String reason, Runnable action) {
        try { action.run(); throw new AssertionError("Expected " + reason); }
        catch (ActionRejectedException rejected) { check(rejected.reason().equals(reason), "Unexpected rejection " + rejected.reason()); }
    }
}
