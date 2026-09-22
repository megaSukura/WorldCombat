package dev.worldcombat.core.runtime;

import dev.worldcombat.core.runtime.effect.*;
import java.util.*;
import java.util.function.*;
import static dev.worldcombat.core.runtime.RuntimeChecks.*;

/** Neutral contract regressions against the real action/effect scheduler and resource transactions. */
public final class CompositionChecks {
    static final Point ORIGIN = new Point(0, 0, 0), DIRECTION = new Point(1, 0, 0);
    static final class Host implements CombatHost {
        final Set<ActorHandle> actors = new HashSet<>();
        record Flight(long owner, ActorHandle source, Consumer<Impact> hit, Runnable complete) {}
        final Map<String, Flight> flights = new LinkedHashMap<>();
        int next, stops, begins, damage, errors;
        public boolean valid(ActorHandle actor) { return actors.contains(actor); }
        public boolean mayAct(ActorHandle actor, UUID controller) { return valid(actor); }
        public Point position(ActorHandle actor) { return ORIGIN; }
        public Impact trace(ActorHandle actor, UUID controller, Point from, Point to, double radius) { return new Impact(to, null, false); }
        public boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount) { return true; }
        public void particle(ActorHandle actor, Point at) {}
        public void report(long id, String content, String message, Throwable error) { if (error != null) errors++; }
        public void begin(long id, ActorHandle actor) { begins++; }
        public void stopMovement(ActorHandle actor) { stops++; }
        public String navigate(ActorHandle actor, Point point, double within, double speed) { return "moving"; }
        public String projectile(long owner, ActorHandle source, UUID controller, Point origin, Point velocity, double gravity, double radius, double range,
                                 int lifetime, Consumer<Impact> hit, Runnable complete, String appearance) {
            String id = "flight-" + ++next; flights.put(id, new Flight(owner, source, hit, complete)); return id;
        }
        public void removeProjectile(long owner, String id) {
            var flight = flights.get(id);
            if (flight != null && flight.owner == owner) { flights.remove(id); flight.complete.run(); }
        }
        public void stopProjectile(long owner, String id) { var flight = flights.get(id); if (flight != null && flight.owner == owner) flight.complete.run(); }
        public boolean projectileDamage(long owner, ActorHandle source, UUID controller, Impact impact, double amount, String data) {
            var flight = flights.get(impact.projectile()); check(flight != null && flight.owner == owner && flight.source.equals(source), "Native lease/source lost");
            damage++; return true;
        }
        public ActorHandle findActor(String domain, UUID identity) { return actors.stream().filter(actor -> actor.identity().equals(identity)).findFirst().orElse(null); }
        void hit(String id, ActorHandle target) { var f = flights.get(id); f.hit.accept(new Impact(ORIGIN, target, false, id, target.entity().toString(), f.source)); }
    }
    static final class Fixture {
        final Host host = new Host(); final ContentRegistry content = new ContentRegistry();
        final ActorHandle actor = handle(UUID.randomUUID(), 1), target = handle(UUID.randomUUID(), 1);
        final ActionRuntime runtime = new ActionRuntime(host, content);
        Fixture() { host.actors.addAll(List.of(actor, target)); content.begin(); }
        void action(String id, String claims, Consumer<ActionContext> start) {
            content.register(content.epoch(), id, "1", 100, start);
            if (claims != null) content.composition(content.epoch(), id, "{\"mode\":\"parallel\",\"claims\":" + claims + "}");
        }
        void ready() { content.complete(true); runtime.reset("content-reloaded"); }
        long start(String id) { return runtime.start(id, actor, target, null); }
        WorldAccess world() { return new WorldAccess(runtime, actor, null, () -> {}, true, 0); }
        void effect(String lifetime, Consumer<EffectContext> start) {
            content.effects().effect(content.epoch(), "checks:emitter", 1, 100, lifetime, EffectData::copy, (version, json) -> json);
            handler("start", start);
        }
        void handler(String key, Consumer<EffectContext> handler) { content.effects().handler(content.epoch(), "checks:emitter", key, handler); }
        String launch(EffectContext e) { return e.world().projectile(ORIGIN, DIRECTION, 0, .2, 20, 40, "hit", "complete", "{\"value\":7}", "{}"); }
    }
    static void reason(Runnable run, String reason) {
        try { run.run(); } catch (ActionRejectedException expected) { check(expected.reason().equals(reason), "Wrong refusal: " + expected.reason()); return; }
        throw new AssertionError("Expected refusal " + reason);
    }
    public static void main(String[] args) {
        scenario("sustained input declarations reserve their control resource at load time", () -> {
            var f = new Fixture(); f.action("checks:a", "[]", a -> {});
            f.content.preview(f.content.epoch(), "checks:a", "{\"input\":{\"version\":1,\"steps\":[\"point\"],\"sustained\":true}}");
            rejected(f::ready); check(!f.content.ready(), "Unclaimable input definition became available");
        });
        scenario("same actor parallel actions retain independent state, payment, events and movement", () -> {
            var f = new Fixture(); ActionContext[] held = new ActionContext[2]; int[] balance = {8}, events = {0, 0};
            f.action("checks:a", "[\"movement\"]", a -> { held[0] = a; a.cost(cost("a", balance, 2, () -> {})); a.commit(8); a.on("checks:event", c -> events[0]++); a.stage("holding"); });
            f.action("checks:b", "[]", b -> { held[1] = b; b.cost(cost("b", balance, 1, () -> {})); b.commit(4); b.on("checks:event", c -> events[1]++); b.after(1, ActionContext::finish); });
            f.action("checks:conflict", "[\"aim\"]", a -> { throw new AssertionError("Conflict reached content"); });
            f.action("checks:legacy", null, a -> {}); f.ready();
            long a = f.start("checks:a"), b = f.start("checks:b");
            check(a != b && balance[0] == 5 && f.runtime.states(f.actor).length == 2, "Contexts or transactions were shared");
            check(f.world().readiness("checks:b").equals("cooldown") && f.world().readiness("checks:conflict").equals("busy"), "Readiness disagrees with submission");
            reason(() -> f.start("checks:conflict"), "busy"); reason(() -> f.start("checks:legacy"), "busy");
            check(!f.runtime.interruptPreparation(f.actor, "checks:conflict"), "Committed control was replaced");
            f.runtime.deliver(f.actor, b, "checks:event"); f.runtime.deliver(f.actor, "checks:event");
            check(events[0] == 1 && events[1] == 2, "Instance delivery or broadcast lost recipients");
            f.world().stopMovement(); check(f.host.stops == 0 && f.world().navigate(DIRECTION, 1, 1).equals("busy"), "Ambient movement clobbered action");
            reason(() -> held[1].stopMovement(), "movement-claim-required");
            f.runtime.tick();
            check(f.runtime.state(f.actor).instance() == a && f.runtime.state(f.actor).stage().equals("holding") && f.host.stops == 0, "B completion clobbered A");
            check(f.world().action(b).reason().equals("finished") && f.world().action(b).committed(), "Independent terminal receipt was hidden by foreground state");
            held[0].finish(); check(f.host.stops == 1 && f.host.begins == 1 && balance[0] == 5, "Movement release/payment was duplicated");
        });
        scenario("aim-only actions acquire steering handoff and release only their own instance", () -> {
            var f = new Fixture(); ActionContext[] held = new ActionContext[1];
            f.action("checks:aim", "[\"aim\"]", a -> { held[0] = a; a.commit(2); });
            f.action("checks:background", "[]", a -> { a.commit(2); a.after(1, ActionContext::finish); });
            f.ready(); f.start("checks:aim"); f.start("checks:background");
            check(f.host.begins == 1 && f.runtime.claimed(f.actor, "aim") && !f.runtime.claimed(f.actor, "movement"), "Aim ownership skipped native handoff or widened its claims");
            check(f.world().navigate(DIRECTION, 1, 1).equals("busy"), "Ambient navigation stole aim");
            reason(() -> held[0].approach(1, 1), "movement-claim-required");
            f.runtime.tick(); check(f.host.stops == 0 && f.runtime.busy(f.actor), "Background release stopped aim ownership");
            held[0].finish(); check(f.host.stops == 1 && !f.runtime.busy(f.actor), "Aim handoff was retained after termination");
        });
        scenario("child linked/independent ownership and failed commit isolation", () -> {
            for (String lifetime : List.of("linked", "independent")) for (boolean cancelled : List.of(false, true)) {
                var f = new Fixture(); ActionContext[] held = new ActionContext[2]; int[] balance = {6};
                f.action("checks:a", "[]", a -> { held[0] = a; a.commit(5); });
                f.action("checks:b", "[]", b -> { held[1] = b; b.cost(cost("b", balance, 1, () -> {})); b.after(2, c -> { c.commit(7); c.finish(); }); });
                f.action("checks:failed", "[]", b -> { b.cost(cost("f", balance, 2, () -> { throw new ActionRejectedException("checks:refused"); })); b.commit(3); });
                f.ready(); long parent = f.start("checks:a");
                var failed = held[0].child("checks:failed", f.target, ORIGIN, DIRECTION, "{}", "linked");
                check(!failed.accepted() && failed.reason().equals("checks:refused") && balance[0] == 6 && f.runtime.state(f.actor, parent) != null, "Child failure escaped into parent or payment");
                var result = held[0].child("checks:b", f.target, ORIGIN, DIRECTION, "{\"selection\":\"fresh\"}", lifetime);
                check(result.accepted() && held[1].parent() == parent && held[1].argument("selection").equals("fresh"), "Child input/lineage not independent");
                if (cancelled) held[0].cancel(); else held[0].finish(); f.runtime.tick(); f.runtime.tick();
                check(balance[0] == (lifetime.equals("linked") ? 6 : 5) && !f.runtime.busy(f.actor), "Child lifetime lost cancellation/continuation");
            }
        });
        scenario("same-definition preparing casts revalidate cooldown before settling", () -> {
            var f = new Fixture(); int[] balance = {4};
            f.action("checks:a", "[]", a -> { a.cost(cost("resource", balance, 1, () -> {})); a.after(1, b -> { b.commit(4); b.finish(); }); });
            f.ready(); f.start("checks:a"); f.start("checks:a"); f.runtime.tick();
            check(balance[0] == 3 && !f.runtime.busy(f.actor) && f.runtime.state(f.actor).reason().equals("cooldown"), "Pending action bypassed cooldown or double-paid");
        });
        scenario("reentrant settlement cannot interleave independent resource transactions", () -> {
            var f = new Fixture(); int[] balance = {4};
            f.action("checks:b", "[]", b -> { b.cost(cost("resource", balance, 2, () -> {})); b.commit(3); });
            f.action("checks:a", "[]", a -> { a.cost(cost("resource", balance, 1, () -> reason(() -> f.start("checks:b"), "transaction-busy"))); a.commit(3); });
            f.ready(); f.start("checks:a");
            check(balance[0] == 3 && f.runtime.states(f.actor).length == 1 && f.runtime.state(f.actor).action().equals("checks:a"), "Reentrant transaction clobbered its caller");
        });
        scenario("input token routes to its claimant while another action owns movement", () -> {
            var f = new Fixture();
            f.action("checks:a", "[\"movement\"]", a -> a.commit(5));
            f.action("checks:b", "[\"input\"]", b -> b.commit(5));
            f.content.preview(f.content.epoch(), "checks:b", "{\"input\":{\"version\":1,\"steps\":[\"point\"],\"sustained\":true}}"); f.ready();
            long a = f.start("checks:a");
            String input = "{\"version\":1,\"token\":9,\"samples\":[{\"kind\":\"point\",\"point\":[0,0,0]}]}";
            long b = f.runtime.start("checks:b", f.actor, ActionTarget.entity(f.target, ORIGIN, DIRECTION), null, Map.of(ActionInput.KEY, input));
            check(f.runtime.state(f.actor).instance() == b && f.runtime.inputToken(f.actor, null) == 9 && f.runtime.control(f.actor, null, 9, input, true), "Foreground/input chose wrong instance");
            check(f.runtime.inputToken(f.actor, null) == 0, "Released token followed an unrelated foreground action");
            check(f.runtime.state(f.actor).instance() == a && f.host.stops == 0, "Input stop released another action's movement");
        });
        scenario("effect-owned flights outlive casting, use fresh scopes and settle each impact once", () -> {
            var f = new Fixture(); List<String> ids = new ArrayList<>(); List<WorldAccess> scopes = new ArrayList<>(); int[] hits = {0}, completes = {0};
            EffectContext[] retained = new EffectContext[1];
            f.effect("actor", e -> { retained[0] = e; scopes.add(e.world()); ids.add(f.launch(e)); ids.add(f.launch(e)); });
            f.handler("hit", e -> {
                hits[0]++; var world = e.world(); scopes.add(world);
                check(e.input().equals("{\"value\":7}") && e.projectileId().equals(e.impact().projectile()), "Named hit lost launch data");
                check(world.projectileHit(e.impact(), 2, "{}") && !world.projectileHit(e.impact(), 2, "{}"), "Impact settled twice");
            });
            f.handler("complete", e -> { completes[0]++; check(e.impact() == null && !e.projectileId().isEmpty(), "Completion scope wrong"); scopes.add(e.world()); e.state("{\"done\":true}"); });
            f.action("checks:a", null, a -> { a.commit(3); a.effect("checks:emitter", f.actor, "{}", 40); a.finish(); });
            f.action("checks:b", null, a -> a.commit(3)); f.ready(); f.start("checks:a"); f.start("checks:b");
            rejected(() -> retained[0].world()); rejected(() -> scopes.getFirst().hurt(f.target, 1, "{}"));
            rejected(() -> f.world().projectile(ORIGIN, DIRECTION, 0, .2, 10, 20, "hit", "complete", "{}", "{}"));
            check(!f.world().projectileActive(ids.getFirst()) && !f.world().cancelProjectile(ids.getFirst()), "Bare hook scope acquired another owner's projectile");
            reason(() -> f.start("checks:b"), "cooldown");
            f.host.hit(ids.get(0), f.target); f.host.hit(ids.get(0), f.target); f.host.flights.get(ids.get(0)).complete.run();
            f.host.hit(ids.get(1), f.target); f.runtime.tick();
            check(hits[0] == 3 && completes[0] == 1 && f.host.damage == 3 && f.runtime.busy(f.actor) && f.runtime.projectiles().size() == 1, "Flight composition/cleanup failed");
            for (WorldAccess scope : scopes) rejected(scope::tick);
            f.runtime.effects().dismiss(1); f.runtime.tick();
            check(f.host.flights.isEmpty() && f.runtime.projectiles().size() == 0 && completes[0] == 1, "Effect termination resumed callbacks");
        });
        scenario("projectile cancel, finish, source loss and reload retire queued callbacks", () -> {
            for (String end : List.of("cancel", "finish", "source", "reload")) {
                var f = new Fixture(); String[] id = {""}; int[] hits = {0}, completed = {0};
                f.effect("persistent", e -> id[0] = f.launch(e)); f.handler("hit", e -> hits[0]++); f.handler("complete", e -> completed[0]++);
                f.handler("operation:checks:stop", e -> { if (end.equals("finish")) e.world().finishProjectile(id[0]); else e.world().cancelProjectile(id[0]); });
                f.ready(); f.world().effect("checks:emitter", f.actor, "{}", 40); f.host.hit(id[0], f.target);
                if (end.equals("source")) f.host.actors.remove(f.actor);
                else if (end.equals("reload")) f.runtime.reset("content-reloaded");
                else f.world().operation(1, "checks:stop", "{}");
                f.runtime.tick();
                check(f.host.flights.isEmpty() && f.runtime.projectiles().size() == 0, "Native resource survived " + end);
                check(hits[0] == (end.equals("finish") ? 1 : 0) && completed[0] == (end.equals("finish") ? 1 : 0), "Queued callback survived " + end);
            }
        });
        scenario("projectile handler failure retires every owned native resource and queued callback", () -> {
            var f = new Fixture(); var ids = new ArrayList<String>(); int[] completed = {0};
            f.effect("actor", e -> { ids.add(f.launch(e)); ids.add(f.launch(e)); });
            f.handler("hit", e -> { throw new IllegalStateException("Neutral handler failure"); });
            f.handler("complete", e -> completed[0]++); f.ready(); f.world().effect("checks:emitter", f.actor, "{}", 40);
            f.host.hit(ids.getFirst(), f.target); f.host.flights.get(ids.getFirst()).complete.run(); f.runtime.tick();
            check(f.host.errors == 1 && completed[0] == 0 && f.host.flights.isEmpty() && f.runtime.projectiles().size() == 0,
                "Failed effect retained functional projectiles or delivered completion");
        });
        scenario("parallel opt-in scales with bounded lifetimes and synchronous invocation depth", () -> {
            var f = new Fixture(); int[] total = {0};
            for (int i = 0; i < 48; i++) { int index = i; f.action("checks:n" + i, "[]", a -> { a.commit(1); total[0]++; if (index < 47 && a.argument("nested") != null) a.child("checks:n" + (index + 1), f.target, ORIGIN, DIRECTION, "{\"nested\":true}", "independent"); }); }
            f.ready(); f.runtime.start("checks:n0", f.actor, ActionTarget.entity(f.target, ORIGIN, DIRECTION), null, Map.of("nested", "true")); check(total[0] == 16, "Synchronous nesting budget lost");
            for (int i = 16; i < 48; i++) f.start("checks:n" + i);
            check(f.runtime.states(f.actor).length == 48, "Parallel work hit an arbitrary actor cap");
            for (int i = 0; i < 100; i++) f.runtime.tick(); check(!f.runtime.busy(f.actor), "Lifetimes failed to bound work");
            for (int i = 0; i < 1200; i++) f.runtime.tick(); check(f.world().action(1) == null, "Terminal receipts retained unbounded history");
        });
        System.out.println("PASS composition runtime checks");
    }
}
