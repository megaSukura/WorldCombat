package dev.worldcombat.core.runtime.effect;

import dev.worldcombat.core.runtime.*;
import java.util.*;
import java.util.function.Consumer;

public final class EffectChecks {
    private static int passed;
    private static final String EFFECT = "checks:state", EVENT = "checks:event";
    private static final class Host implements CombatHost {
        final Set<ActorHandle> actors = new HashSet<>();
        final Thread thread = Thread.currentThread();
        String authority = "owner-a";
        int errors;
        Runnable changedObserver = () -> {};
        boolean permission = true, dimension = true;
        ActorHandle far;
        final List<ActorHandle> changes = new ArrayList<>();
        final Map<Long, List<Runnable>> resources = new HashMap<>();
        final Map<String, String> presentations = new HashMap<>();
        public void present(long owner, ActorHandle source, String key, String type, int version, Point point, String data) {
            presentations.put(owner + "/" + key, data);
        }
        public void lease(long owner, Runnable cleanup) { resources.computeIfAbsent(owner, key -> new ArrayList<>()).add(cleanup); }
        public void release(long owner, String reason) {
            presentations.keySet().removeIf(key -> key.startsWith(owner + "/"));
            var values = resources.remove(owner);
            if (values != null) for (var cleanup : values) cleanup.run();
        }
        public void effectChanged(ActorHandle actor) { changes.add(actor); changedObserver.run(); }
        public boolean valid(ActorHandle actor) { return actors.contains(actor); }
        public boolean mayAct(ActorHandle actor, UUID controller) { return valid(actor) && permission; }
        public boolean sameWorld(ActorHandle first, ActorHandle second) { return dimension; }
        public Point position(ActorHandle actor) { return new Point(actor.equals(far) ? 65 : 0, 0, 0); }
        public Impact trace(ActorHandle actor, UUID controller, Point from, Point to, double radius) { throw new UnsupportedOperationException(); }
        public boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount) { return true; }
        public void particle(ActorHandle actor, Point point) {}
        public void report(long instance, String content, String message, Throwable error) { if (error != null) errors++; }
        public String controlIdentity(ActorHandle actor) { return authority; }
        public ActorHandle findActor(String domain, UUID identity) { return actors.stream().filter(a -> a.domain().equals(domain) && a.identity().equals(identity)).findFirst().orElse(null); }
        public void checkThread() { if (Thread.currentThread() != thread) throw new IllegalStateException("Wrong thread"); }
    }
    private static final class Fixture {
        final Host host = new Host();
        final EffectRegistry registry = new EffectRegistry();
        final ActorHandle actor = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1);
        final EffectRuntime runtime;
        Fixture() { registry.begin(1); host.actors.add(actor); runtime = new EffectRuntime(host, registry); }
        void effect(String id, String lifetime, Consumer<EffectContext> start) {
            registry.effect(registry.epoch(), id, 1, 200, lifetime, EffectData::copy, (version, data) -> { throw new IllegalArgumentException("No migration"); });
            registry.handler(registry.epoch(), id, "start", start);
        }
        void handler(String id, String key, Consumer<EffectContext> callback) { registry.handler(registry.epoch(), id, key, callback); }
        void event() { registry.event(registry.epoch(), EVENT, 1, EffectData::copy); registry.phase(registry.epoch(), EVENT, "checks:first", ""); }
        void ready() { registry.complete(true); }
        long create(String id) { return runtime.create(id, actor, actor, null, 1, "{}", 100); }
        String emit(String json) { return runtime.emit(EVENT, 1, actor, actor, null, json); }
    }
    private static void require(boolean value, String reason) { if (!value) throw new AssertionError(reason); }
    private static void rejects(Runnable body) {
        try { body.run(); } catch (IllegalArgumentException | IllegalStateException expected) { return; }
        throw new AssertionError("Expected rejection");
    }
    private static void scenario(String name, Runnable body) { body.run(); passed++; System.out.println("PASS effects " + name); }
    public static void main(String[] args) {
        scenario("effect snapshot transaction commits all states before observing and rejects stale or malformed sets", () -> {
            var f = new Fixture(); f.effect(EFFECT, "actor", effect -> {}); f.ready();
            long first = f.create(EFFECT), second = f.create(EFFECT);
            var updates = new com.google.gson.JsonArray();
            for (long id : new long[]{first, second}) { var value = new com.google.gson.JsonObject();
                value.addProperty("id", id); value.addProperty("expected", "{}"); value.addProperty("data", "{\"value\":1}"); updates.add(value); }
            var request = new com.google.gson.JsonObject(); request.add("updates", updates);
            final int[] observations = {0};
            f.host.changedObserver = () -> {
                require(number(f.runtime.state(first), "value") == 1 && number(f.runtime.state(second), "value") == 1, "Observer saw a half-committed transfer"); observations[0]++;
            };
            require(f.runtime.compareStates(f.actor, null, request.toString()) && observations[0] == 2, "Two-state commit or notifications failed");
            f.host.changedObserver = () -> {};
            require(!f.runtime.compareStates(f.actor, null, request.toString()), "Stale snapshots wrote new state");
            updates.forEach(value -> value.getAsJsonObject().addProperty("expected", "{\"value\":1}"));
            updates.get(0).getAsJsonObject().addProperty("data", "{\"value\":2}");
            updates.get(1).getAsJsonObject().addProperty("data", "[]");
            rejects(() -> f.runtime.compareStates(f.actor, null, request.toString()));
            require(number(f.runtime.state(first), "value") == 1, "Normalization failure wrote the earlier participant");
            updates.get(1).getAsJsonObject().addProperty("data", "{\"value\":2}");
            updates.get(1).getAsJsonObject().addProperty("id", first);
            rejects(() -> f.runtime.compareStates(f.actor, null, request.toString()));
            updates.get(1).getAsJsonObject().addProperty("id", second);
            f.host.permission = false; require(!f.runtime.compareStates(f.actor, null, request.toString()), "Unavailable owner mutated a transaction"); f.host.permission = true;
            f.host.dimension = false; require(!f.runtime.compareStates(f.actor, null, request.toString()), "Cross-dimension owner mutated state"); f.host.dimension = true;
            var receiver = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1); f.host.actors.add(receiver);
            long distant = f.runtime.create(EFFECT, f.actor, receiver, null, 1, "{}", 100); f.host.far = receiver;
            updates.get(1).getAsJsonObject().addProperty("id", distant); updates.get(1).getAsJsonObject().addProperty("expected", "{}");
            rejects(() -> f.runtime.compareStates(f.actor, null, request.toString()));
            require(number(f.runtime.state(first), "value") == 1 && f.runtime.state(distant).equals("{}"), "Range refusal partly committed");
        });
        scenario("committed effect transactions retain their receipt when an observer fails", () -> {
            var f = new Fixture(); f.effect(EFFECT, "actor", effect -> {}); f.ready(); long id = f.create(EFFECT);
            var value = new com.google.gson.JsonObject(); value.addProperty("id", id); value.addProperty("expected", "{}"); value.addProperty("data", "{\"value\":2}");
            var updates = new com.google.gson.JsonArray(); updates.add(value); var request = new com.google.gson.JsonObject(); request.add("updates", updates);
            f.host.changedObserver = () -> { throw new IllegalStateException("Expected observer fault"); };
            require(f.runtime.compareStates(f.actor, null, request.toString()), "Committed states were reported as failed");
            require(number(f.runtime.state(id), "value") == 2 && f.host.errors == 1, "Observer error was lost or the commit was rolled back");
        });
        scenario("reentrant observers make later changes after the complete transaction", () -> {
            var f = new Fixture(); f.effect(EFFECT, "actor", effect -> {});
            f.handler(EFFECT, "operation:checks:later", effect -> effect.state("{\"value\":5}")); f.ready();
            long first = f.create(EFFECT), second = f.create(EFFECT); var updates = new com.google.gson.JsonArray();
            for (long id : new long[]{first, second}) { var value = new com.google.gson.JsonObject(); value.addProperty("id", id);
                value.addProperty("expected", "{}"); value.addProperty("data", "{\"value\":1}"); updates.add(value); }
            var request = new com.google.gson.JsonObject(); request.add("updates", updates); final boolean[] seen = {false};
            f.host.changedObserver = () -> { if (seen[0]) return; seen[0] = true;
                require(number(f.runtime.state(first), "value") == 1 && number(f.runtime.state(second), "value") == 1, "Reentrant observer entered a half commit");
                f.runtime.operate(second, "checks:later", f.actor, null, "{}"); };
            require(f.runtime.compareStates(f.actor, null, request.toString()) && number(f.runtime.state(second), "value") == 5,
                "Later observer mutation was overwritten by the original commit");
        });
        scenario("native post-commit notifications stop at replacement or departure and retain committed failures", () -> {
            var f = new Fixture(); Object installed = new Object(); Object[] current = {installed}; boolean[] alive = {true}; int[] calls = {0};
            dev.worldcombat.core.world.PostCommitNotifications.run(f.host, "checks:notifications", () -> alive[0] && current[0] == installed,
                () -> { calls[0]++; current[0] = new Object(); }, () -> { throw new AssertionError("Obsolete instance installed attributes after replacement"); });
            require(calls[0] == 1 && f.host.errors == 0, "Replacement did not stop the old notification sequence");
            current[0] = installed;
            dev.worldcombat.core.world.PostCommitNotifications.run(f.host, "checks:notifications", () -> alive[0] && current[0] == installed,
                () -> { alive[0] = false; }, () -> { throw new AssertionError("Departed entity received an old started callback"); });
            alive[0] = true;
            dev.worldcombat.core.world.PostCommitNotifications.run(f.host, "checks:notifications", () -> alive[0] && current[0] == installed,
                () -> { throw new IllegalStateException("Expected notification fault"); }, () -> calls[0]++);
            require(calls[0] == 2 && f.host.errors == 1 && current[0] == installed, "Notification failure hid the committed state or skipped a still-current later callback");
        });
        scenario("attached presentation follows its existing owner and rejects a foreign source", () -> {
            var f = new Fixture(); f.effect(EFFECT, "actor", effect -> {});
            f.handler(EFFECT, "operation:checks:dispel", EffectContext::end); f.ready();
            long id = f.create(EFFECT); var at = new Point(0, 0, 0);
            require(f.runtime.present(id, f.actor, null, "outline", "checks:scene", 1, at, "{}"), "Live owned effect refused a scene");
            require(f.runtime.present(id, f.actor, null, "outline", "checks:scene", 1, at, "{\"phase\":2}"), "Scene update failed");
            require(f.host.presentations.size() == 1, "Updating a scene created duplicate owners");
            var other = new ActorHandle("checks", UUID.randomUUID(), UUID.randomUUID(), 1); f.host.actors.add(other);
            require(!f.runtime.present(id, other, null, "foreign", "checks:scene", 1, at, "{}"), "Another source attached to the effect");
            f.runtime.operate(id, "checks:dispel", f.actor, null, "{}");
            require(f.host.presentations.isEmpty(), "Early dispel retained the presentation");
            require(!f.runtime.present(id, f.actor, null, "outline", "checks:scene", 1, at, "{}"), "Ended effect accepted a presentation");
        });
        scenario("source invalidation releases resources without invoking unavailable end handlers", () -> {
            var f = new Fixture(); final int[] cleanup = {0}, end = {0};
            f.effect(EFFECT, "actor", effect -> f.host.lease(-effect.id(), () -> cleanup[0]++));
            f.handler(EFFECT, "end", effect -> end[0]++); f.ready(); long id = f.create(EFFECT);
            f.host.actors.remove(f.actor); f.runtime.tick();
            require(!f.runtime.exists(id) && cleanup[0] == 1 && end[0] == 0,
                "Invalidation needed the script end handler or failed to release resources once");
            f.runtime.tick(); require(cleanup[0] == 1, "Resource cleanup ran twice");
        });
        scenario("ending inside start unwinds later scheduling without disabling the effect", () -> {
            var f = new Fixture();
            f.effect(EFFECT, "actor", effect -> { effect.end(); effect.schedule("later", "later", 1, "{}"); });
            f.handler(EFFECT, "later", effect -> { throw new AssertionError("Ended effect resumed"); });
            f.ready(); long first = f.create(EFFECT); long second = f.create(EFFECT);
            require(!f.runtime.exists(first) && !f.runtime.exists(second) && f.host.errors == 0, "A completed child failed or disabled its definition");
        });
        scenario("effect instances and event reactions scale past former caps", () -> {
            var f = new Fixture(); f.event(); final int[] called = {0};
            f.effect(EFFECT, "persistent", e -> e.listen(EVENT, "checks:first", "react"));
            f.handler(EFFECT, "react", e -> called[0]++); f.ready();
            for (int i = 0; i < 900; i++) f.create(EFFECT);
            f.emit("{}");
            require(called[0] == 900 && f.host.errors == 0, "Large effect population or reaction chain was capped");
            var saved = f.runtime.snapshot();
            require(saved.size() == 900, "Persistence truncated the population");
        });
        scenario("composition changes notify once while unchanged ticks remain silent", () -> {
            var f = new Fixture();f.effect(EFFECT,"persistent",e -> {});
            f.handler(EFFECT,"operation:checks:state",e -> e.state(e.input()));
            f.handler(EFFECT,"operation:checks:end",EffectContext::end);
            f.ready();long id=f.create(EFFECT);
            require(f.host.changes.equals(List.of(f.actor)),"Create did not publish the affected actor");
            f.host.changes.clear();for(int i=0;i<5;i++)f.runtime.tick();
            f.runtime.operate(id,"checks:state",f.actor,null,"{}");
            require(f.host.changes.isEmpty(),"Unchanged data or remaining time produced notification polling");
            f.runtime.operate(id,"checks:state",f.actor,null,"{\"stage\":1}");
            require(f.host.changes.equals(List.of(f.actor)),"Actual state change was not observable");
            f.host.changes.clear();f.runtime.operate(id,"checks:end",f.actor,null,"{}");
            require(f.host.changes.equals(List.of(f.actor)),"Effect removal was not observable");
            var other=new ActorHandle("checks",UUID.randomUUID(),UUID.randomUUID(),2);f.host.actors.add(other);f.host.changes.clear();
            f.runtime.create(EFFECT,f.actor,other,null,0,"{}",50);
            require(f.host.changes.containsAll(List.of(f.actor,other)),"Source and recipient views must both invalidate");
            f.host.changes.clear();f.runtime.reload();
            require(f.host.changes.containsAll(List.of(f.actor,other)),"Suspension was not observable");
            f.host.changes.clear();f.runtime.tick();
            require(f.host.changes.containsAll(List.of(f.actor,other)),"Restored composition was not observable");
        });
        scenario("plain JSON state retains large values and validates structure", () -> {
            require(EffectData.copy("{\"nested\": [1, true, null, {\"label\":\"ok\"}]}").contains("nested"), "Structured data rejected");
            rejects(() -> EffectData.copy("{\"amount\":1e999}"));
            rejects(() -> EffectData.copy("{unquoted:1}"));
            rejects(() -> EffectData.copy("{} {}"));
            rejects(() -> EffectData.copy(""));
            require(EffectData.copy("{\"s\":\"" + "x".repeat(70000) + "\"}").length() > 70000, "Large state was truncated");
            require(EffectData.copy("{\"v\":" + "[".repeat(20) + "0" + "]".repeat(20) + "}").contains("0"), "Nested state rejected");
            var provenance = "{\"v\":" + "[".repeat(20) + "0" + "]".repeat(20) + "}";
            require(EffectData.copy(provenance, new EffectData.Limits(65536, 24, 8192, 8192)).equals(provenance),
                "A document's nested provenance incorrectly used transient effect limits");
            rejects(() -> EffectData.copy("{\"v\":1e999}", new EffectData.Limits(65536, 24, 8192, 8192)));
        });
        scenario("script phase dependencies override instance registration order", () -> {
            var f = new Fixture(); f.event(); f.registry.phase(1, EVENT, "checks:second", "checks:first");
            f.effect("checks:add", "actor", e -> e.listen(EVENT, "checks:second", "change"));
            f.handler("checks:add", "change", e -> e.event().payload("{\"value\":" + (number(e.event().payload(), "value") + 2) + "}"));
            f.effect("checks:half", "actor", e -> e.listen(EVENT, "checks:first", "change"));
            f.handler("checks:half", "change", e -> e.event().payload("{\"value\":" + number(e.event().payload(), "value") / 2 + "}"));
            f.ready(); f.create("checks:add"); f.create("checks:half");
            require(number(f.emit("{\"value\":6}"), "value") == 5, "Phases ran in instance order");
        });
        scenario("cycles, missing phases and package version errors fail loading", () -> {
            var f = new Fixture(); f.event(); f.registry.phase(1, EVENT, "checks:cycle", "checks:cycle"); rejects(f::ready);
            require(!f.registry.ready(), "Cycle became usable");
            var missing = new Fixture(); missing.registry.event(1, EVENT, 1, EffectData::copy);
            missing.registry.phase(1, EVENT, "checks:phase", "checks:missing"); rejects(missing::ready);
            var pkg = new Fixture(); pkg.registry.pack(1, "checks:child", "1", "{\"checks:base\":\"2\"}");
            pkg.registry.pack(1, "checks:base", "1", "{}"); rejects(pkg::ready);
        });
        scenario("expired callback and event capabilities reject writes", () -> {
            var f = new Fixture(); var held = new EffectContext[1]; var event = new EffectEvent[1]; f.event();
            f.effect(EFFECT, "actor", e -> { held[0] = e; e.listen(EVENT, "checks:first", "seen"); });
            f.handler(EFFECT, "seen", e -> event[0] = e.event()); f.ready(); long id = f.create(EFFECT);
            rejects(() -> held[0].state("{\"late\":true}")); f.emit("{}"); rejects(() -> event[0].payload("{}"));
            require(f.runtime.state(id).equals("{}") && f.host.errors == 0, "Retained handle changed state");
        });
        scenario("named timers and action lifetime clean up", () -> {
            var f = new Fixture(); f.effect(EFFECT, "action", e -> e.schedule("work", "work", 2, "{}"));
            f.handler(EFFECT, "work", e -> { throw new AssertionError("Removed timer ran"); }); f.ready(); f.create(EFFECT);
            f.runtime.actionEnded(1); f.runtime.tick(); f.runtime.tick();
            require(f.runtime.stats().active() == 0 && f.runtime.stats().timers() == 0, "Action-bound effects leaked");
        });
        scenario("event provenance and bounded recursion", () -> {
            var f = new Fixture(); f.event(); long[] root = {0};
            f.effect(EFFECT, "actor", e -> e.listen(EVENT, "checks:first", "loop"));
            f.handler(EFFECT, "loop", e -> {
                var event = e.event();
                require(event.protocol().equals(EVENT) && event.version() == 1 && event.phase().equals("checks:first"), "Event metadata lost");
                if (event.parent() == 0) root[0] = event.root();
                else require(event.root() == root[0] && event.parent() != 0 && event.originKind().equals("effect") && event.origin() == e.id(), "Causal chain was lost");
                e.emit(EVENT, 1, e.target(), "{}");
            }); f.ready(); f.create(EFFECT); rejects(() -> f.emit("{}"));
            require(f.registry.get(EFFECT) == null && f.runtime.stats().active() == 0 && f.host.errors == 1, "Recursive content was not isolated once");
        });
        scenario("script failure isolates its effect and rolls back event payload", () -> {
            var f = new Fixture(); f.event(); f.effect(EFFECT, "actor", e -> e.listen(EVENT, "checks:first", "fail"));
            f.handler(EFFECT, "fail", e -> { e.event().payload("{\"value\":20}"); throw new IllegalStateException("fixture"); });
            f.effect("checks:healthy", "actor", e -> {}); f.ready(); f.create(EFFECT); long healthy = f.create("checks:healthy");
            rejects(() -> f.emit("{\"value\":1}"));
            require(f.runtime.state(healthy) != null && f.host.errors == 1, "Healthy effects were disabled");
        });
        scenario("declared operations and refusal keep content available", () -> {
            var f = new Fixture(); f.effect(EFFECT, "actor", e -> {});
            f.handler(EFFECT, "operation:checks:refuse", e -> e.reject("not-allowed"));
            f.handler(EFFECT, "operation:checks:remove", EffectContext::end); f.ready(); long id = f.create(EFFECT);
            require(!f.runtime.operate(id, "checks:unknown", f.actor, null, "{}"), "Undeclared operation ran");
            rejects(() -> f.runtime.operate(id, "checks:refuse", f.actor, null, "{}"));
            require(f.registry.get(EFFECT) != null, "Normal refusal disabled content");
            require(f.runtime.operate(id, "checks:remove", f.actor, null, "{}") && f.runtime.stats().active() == 0, "Remove operation failed");
        });
        scenario("persistent timers restore their remaining delay without replaying start", () -> {
            var f = new Fixture(); int[] starts = {0};
            f.effect(EFFECT, "persistent", e -> { starts[0]++; e.schedule("write", "write", 5, "{\"value\":9}"); });
            f.handler(EFFECT, "write", e -> e.state(e.input())); f.ready(); long id = f.create(EFFECT); f.runtime.tick(); f.runtime.tick();
            var saved = f.runtime.snapshot(); f.runtime.stop();
            var restored = new EffectRuntime(f.host, f.registry); restored.load(saved);
            restored.tick(); restored.tick(); require(restored.state(id).equals("{}"), "Timer ran early"); restored.tick();
            require(number(restored.state(id), "value") == 9 && starts[0] == 1, "Timer replayed or start duplicated");
        });
        scenario("refused creation leaves no persistent instance", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> e.reject("not-now")); f.ready();
            rejects(() -> f.create(EFFECT));
            require(f.runtime.snapshot().isEmpty() && f.runtime.stats().active() == 0 && f.registry.get(EFFECT) != null,
                "Rejected creation leaked or disabled its definition");
        });
        scenario("due timers respect same-tick cancellation and replacement", () -> {
            var f = new Fixture(); int[] calls = {0}; f.effect(EFFECT, "actor", e -> {
                e.schedule("cancel", "cancel", 1, "{}"); e.schedule("later", "later", 1, "{}");
                e.schedule("removed", "removed", 1, "{}");
            });
            f.handler(EFFECT, "cancel", e -> { e.unschedule("removed"); e.schedule("later", "later", 1, "{}"); });
            f.handler(EFFECT, "later", e -> calls[0]++);
            f.handler(EFFECT, "removed", e -> { throw new AssertionError("Cancelled timer ran"); });
            f.ready(); f.create(EFFECT); f.runtime.tick();
            require(f.runtime.stats().timers() == 1 && calls[0] == 0, "Replaced timer ran in the old dispatch");
            f.runtime.tick();
            require(f.runtime.stats().timers() == 0 && calls[0] == 1 && f.host.errors == 0, "Timer cancellation or rescheduling failed");
        });
        scenario("ended persistent effects stay ended when a retained context is used", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> {});
            f.handler(EFFECT, "operation:checks:end", e -> { e.end(); e.state("{}"); });
            f.ready(); long id = f.create(EFFECT);
            rejects(() -> f.runtime.operate(id, "checks:end", f.actor, null, "{}"));
            f.runtime.tick();
            require(f.runtime.snapshot().isEmpty() && f.runtime.stats().active() == 0, "Ended effect was resurrected");
        });
        scenario("reload migrates state through script and removal clears only owned records", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> e.state("{\"old\":3}")); f.ready(); long id = f.create(EFFECT);
            f.registry.begin(2); f.runtime.reload();
            f.registry.effect(2, EFFECT, 2, 200, "persistent", EffectData::copy,
                (version, json) -> "{\"new\":" + number(json, "old") + "}");
            f.registry.handler(2, EFFECT, "start", e -> { throw new AssertionError("Migration restarted effect"); });
            f.registry.complete(true); f.runtime.tick();
            require(number(f.runtime.state(id), "new") == 3, "Schema migration failed");
            f.registry.begin(3); f.registry.complete(true); f.runtime.tick();
            require(f.runtime.snapshot().isEmpty() && f.runtime.stats().active() == 0, "Removed package retained effects");
        });
        scenario("failed migration retains data for a corrected package", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> e.state("{\"old\":4}")); f.ready(); f.create(EFFECT);
            f.registry.begin(2); f.runtime.reload();
            f.registry.effect(2, EFFECT, 2, 200, "persistent", EffectData::copy, (v, j) -> { throw new IllegalStateException("bad migration"); });
            f.registry.handler(2, EFFECT, "start", e -> {}); f.registry.complete(true); f.runtime.tick();
            require(f.runtime.stats().paused() == 1 && f.runtime.snapshot().getFirst().contains("old"), "Failed migration lost state");
        });
        scenario("ownership change prevents persistent effect reattachment", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> {}); f.ready(); f.create(EFFECT);
            var snapshot = f.runtime.snapshot(); f.runtime.stop(); f.host.authority = "owner-b";
            var restored = new EffectRuntime(f.host, f.registry); restored.load(snapshot); restored.tick();
            require(restored.stats().active() == 0 && restored.snapshot().isEmpty(), "Effect crossed ownership boundary");
        });
        scenario("wrong-thread mutation is rejected; a malformed saved record is reported and dropped", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> {}); f.ready();
            boolean[] rejected = {false}; var thread = new Thread(() -> { try { f.create(EFFECT); } catch (IllegalStateException expected) { rejected[0] = true; } });
            thread.start(); try { thread.join(); } catch (InterruptedException error) { throw new RuntimeException(error); }
            require(rejected[0] && f.runtime.stats().active() == 0, "Off-thread effect was accepted");
            int before = f.host.errors;
            f.runtime.load(List.of("{}"));
            require(f.host.errors == before + 1 && f.runtime.stats().paused() == 0, "Malformed saved record was not reported and dropped");
        });
        scenario("an instance expiring inside a reload is over, not saved", () -> {
            var f = new Fixture(); f.effect(EFFECT, "persistent", e -> {});
            f.handler(EFFECT, "end", e -> f.runtime.reload()); // content reload racing the expiry
            f.ready();
            f.runtime.create(EFFECT, f.actor, f.actor, null, 1, "{}", 1);
            f.runtime.tick(); // remaining reaches 0, end runs, reload suspends everything still active
            require(f.runtime.stats().active() == 0 && f.runtime.snapshot().isEmpty(), "Expired instance survived into the snapshot");
        });
        System.out.println("Effect checks passed: " + passed);
    }
    private static double number(String json, String field) { return com.google.gson.JsonParser.parseString(json).getAsJsonObject().get(field).getAsDouble(); }
}
