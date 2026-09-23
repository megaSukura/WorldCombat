package dev.worldcombat.core.runtime;

import java.util.*;
import java.util.function.Consumer;

public final class RuntimeChecks {
    static final String ACTION = "checks:bolt";
    static int passed;
    static final class Host implements CombatHost {
        final Set<ActorHandle> actors = new HashSet<>();
        final Map<ActorHandle, WorldObservation> observations = new LinkedHashMap<>();
        final Map<Long, List<Runnable>> leases = new HashMap<>();
        final Thread owner = Thread.currentThread();
        ActorHandle target;
        int damage, errors;
        int commitments, releases;
        double lastDamage, lastHealth, lastHelperHealth;
        int receipts, receiptTicks;
        String receiptData;
        public boolean valid(ActorHandle handle) { return actors.contains(handle); }
        public boolean mayAct(ActorHandle actor, UUID controller) { return valid(actor); }
        public WorldObservation observe(ActorHandle source, ActorHandle target) { return observations.get(target); }
        public ActorHandle[] query(ActorHandle source, Point centre, double radius, boolean visibleOnly) { return observations.keySet().toArray(ActorHandle[]::new); }
        public ActorHandle actorNear(ActorHandle source, UUID entity) { return actors.stream().filter(actor -> actor.entity().equals(entity)).findFirst().orElse(null); }
        public Point position(ActorHandle handle) { return new Point(handle.equals(target) ? 2 : 0, 0, 0); }
        public Impact trace(ActorHandle actor, UUID controller, Point from, Point to, double radius) {
            return new Impact(to, target, false);
        }
        public Impact moveSweep(ActorHandle actor, UUID controller, Point delta, double radius) {
            return new Impact(position(actor).plus(delta), target, false);
        }
        public boolean damage(ActorHandle actor, ActorHandle target, UUID controller, double amount) { damage++; lastDamage = amount; return true; }
        public double health(ActorHandle source, ActorHandle target, UUID controller, double delta, String cause) { return lastHealth = delta; }
        public ActorHandle helper(long owner, ActorHandle source, Point point, double health, String data, int ticks) { lastHelperHealth = health; return target; }
        public void particle(ActorHandle actor, Point point) {}
        public void presentFor(long owner, ActorHandle actor, String key, String type, int version, Point point, String data, int ticks) {
            check(owner != 0, "Receipt lost its publisher identity"); receipts++; receiptTicks = ticks; receiptData = data;
        }
        public void report(long id, String content, String message, Throwable error) { if (error != null) errors++; }
        public void committed(ActionContext action) { commitments++; }
        public void lease(long instance, Runnable cleanup) { leases.computeIfAbsent(instance, ignored -> new ArrayList<>()).add(cleanup); }
        public void release(long instance, String reason) {
            releases++; var cleanup = leases.remove(instance); if (cleanup != null) cleanup.forEach(Runnable::run);
        }
        public void checkThread() { if (Thread.currentThread() != owner) throw new IllegalStateException("Wrong thread"); }
    }
    static final class Fixture {
        final Host host = new Host();
        final ContentRegistry content = new ContentRegistry();
        final ActionRuntime runtime = new ActionRuntime(host, content);
        final ActorHandle actor = handle(UUID.randomUUID(), 1);
        final ActorHandle target = handle(UUID.randomUUID(), 1);
        Fixture(Consumer<ActionContext> callback) { this(callback, "{}"); }
        Fixture(Consumer<ActionContext> callback, String preview) {
            host.actors.addAll(List.of(actor, target)); host.target = target;
            content.begin(); content.register(content.epoch(), ACTION, "test", 100, callback); content.preview(content.epoch(), ACTION, preview); content.complete(true);
        }
        void start() { runtime.start(ACTION, actor, target, null); }
        void empty() {
            var stats = runtime.stats();
            check(stats.instances() == 0 && stats.tasks() == 0 && stats.listeners() == 0, "Resources must be released");
        }
    }
    static ActorHandle handle(UUID identity, long generation) {
        return new ActorHandle("test", identity, UUID.randomUUID(), generation);
    }
    static void check(boolean valid, String message) { if (!valid) throw new AssertionError(message); }
    static void rejected(Runnable action) {
        try { action.run(); } catch (IllegalArgumentException | IllegalStateException expected) { return; }
        throw new AssertionError("Operation should have been rejected");
    }
    static void scenario(String name, Runnable body) { body.run(); passed++; System.out.println("PASS " + name); }

    static CommitCost cost(String key, int[] balance, int amount, Runnable afterWrite) {
        return new CommitCost() {
            int before;
            boolean written;
            public String key() { return key; }
            public void prepare(ActionContext action) {
                before = balance[0];
                if (before < amount) throw new ActionRejectedException("insufficient-resource");
            }
            public void apply() { written = true; balance[0] -= amount; afterWrite.run(); }
            public void rollback() { if (written) { balance[0] = before; written = false; } }
        };
    }

    public static void main(String[] arguments) throws Exception {
        scenario("rejection reactions run once after rollback with an independent writable scope", () -> {
            var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(actor, target)); host.target = target;
            var content = new ContentRegistry(); content.begin(); int[] balance = {3}, reactions = {0};
            var runtime = new ActionRuntime(host, content);
            content.register(content.epoch(), ACTION, "1", 20, action -> {
                action.cost(cost("first", balance, 1, () -> { throw new ActionRejectedException("fixture-failure"); }));
                action.commit(8);
            });
            content.hooks().register(content.epoch(), "checks:failed", "world_combat:action_rejected", "", event -> {
                check(balance[0] == 3 && !runtime.busy(actor), "Rejection reaction preceded rollback or lease release");
                var data = com.google.gson.JsonParser.parseString(event.data()).getAsJsonObject();
                check(data.get("reason").getAsString().equals("fixture-failure") && !data.get("committed").getAsBoolean(), "Lost refusal outcome");
                check(event.action() == null, "Reaction retained an expired action scope");
                event.world().health(actor, -1, "checks:failed-cost"); reactions[0]++;
            });
            content.complete(true);
            try { runtime.start(ACTION, actor, target, null); throw new AssertionError("Failed commit was accepted"); }
            catch (ActionRejectedException expected) { check(expected.reason().equals("fixture-failure"), "Wrong rejection reached the caller"); }
            check(reactions[0] == 1 && host.lastHealth == -1 && host.errors == 0 && runtime.cooldown(actor, ACTION) == 0,
                "Rejection consumed costs, lost its writable reaction, or disabled content");
        });
        scenario("survey preserves body centres, world-axis velocity and actor domains", () -> {
            var fixture = new Fixture(ActionContext::finish);
            var actor = new ActorHandle("checks_native", UUID.randomUUID(), UUID.randomUUID(), 2);
            var centre = new Point(-3, 8, 5); var motion = new Point(-.25, .5, .125);
            var moving = new WorldObservation(actor, centre, 8, 10, .7, true, false, false, false, false, true,
                null, null, 4, "checks:label", 2, 6, motion);
            var idle = new WorldObservation(fixture.actor, new Point(0, 1, 0), 10, 10, .9, true, true, false, false, false, true,
                null, null, 4, "", 1, 2, new Point(0, 0, 0));
            fixture.host.actors.add(actor); fixture.host.observations.put(actor, moving); fixture.host.observations.put(fixture.actor, idle);
            var world = new WorldAccess(fixture.runtime, fixture.actor, null, () -> {}, false, 0);
            var retained = world.observe(actor);
            var subjects = com.google.gson.JsonParser.parseString(world.survey(new Point(0, 0, 0), 16, false, 8, "", "")).getAsJsonArray();
            var first = subjects.get(0).getAsJsonObject(); var second = subjects.get(1).getAsJsonObject();
            check(first.get("domain").getAsString().equals(actor.domain()) && second.get("domain").getAsString().equals(fixture.actor.domain()),
                "Survey derived a domain from an unrelated identity");
            check(first.getAsJsonArray("point").equals(com.google.gson.JsonParser.parseString("[-3.0,8.0,5.0]")), "Survey shifted the body centre");
            check(first.getAsJsonArray("velocity").equals(com.google.gson.JsonParser.parseString("[-0.25,0.5,0.125]")), "Survey changed velocity axes or units");
            check(second.getAsJsonArray("velocity").equals(com.google.gson.JsonParser.parseString("[0,0,0]")) && first.get("speed").getAsDouble() == .7,
                "Native motion was replaced by the movement-speed attribute");
            fixture.host.observations.put(actor, new WorldObservation(actor, centre, 8, 10, .7, true, false, false, false, false, true,
                null, null, 4, "checks:label", 2, 6, new Point(0, 0, 0)));
            check(retained.velocity().equals(motion) && world.observe(actor).velocity().length() == 0, "Velocity observation was not a detached snapshot");
        });
        scenario("per-definition preparation and commit gates retain authority and resources", () -> {
            var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(actor, target)); host.target = target;
            var content = new ContentRegistry(); content.begin(); int[] balance = {3}, prepared = {0}, gated = {0};
            for (var name : List.of("checks:eligible", "checks:restricted")) content.register(content.epoch(), name, "1", 20, action -> {
                prepared[0]++; action.data("checks:eligibility", "{\"allowed\":" + name.equals("checks:eligible") + "}");
                action.cost(cost("resource", balance, 1, () -> {})); action.after(1, next -> { next.commit(8); next.finish(); });
            });
            content.hooks().register(content.epoch(), "checks:policy", "world_combat:before_commit", "", event -> {
                gated[0]++;
                if (!com.google.gson.JsonParser.parseString(event.action().data("checks:eligibility")).getAsJsonObject().get("allowed").getAsBoolean())
                    event.reject("checks:ineligible");
            });
            content.complete(true); var runtime = new ActionRuntime(host, content);
            runtime.start("checks:eligible", actor, target, null); runtime.tick();
            runtime.start("checks:restricted", actor, target, null); runtime.tick();
            check(prepared[0] == 2 && gated[0] == 2 && balance[0] == 2 && host.commitments == 1 && host.errors == 0,
                "Definition policy skipped preparation or paid for a rejected commit");
            check(runtime.cooldown(actor, "checks:restricted") == 0 && !runtime.busy(actor), "Rejected definition retained its transaction");
            host.actors.remove(actor);
            rejected(() -> runtime.start("checks:eligible", actor, target, null));
            check(prepared[0] == 2, "Unavailable actor reached definition policy");
        });
        scenario("cooldown queries finalize custom commit durations once before resource settlement", () -> {
            var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(actor, target)); host.target = target;
            var content = new ContentRegistry(); content.begin(); int[] balance = {3}, queries = {0};
            content.register(content.epoch(), ACTION, "1", 20, action -> {
                action.cost(cost("resource", balance, 1, () -> {})); action.commit(120); action.finish();
            });
            content.hooks().register(content.epoch(), "checks:timing", "world_combat:cooldown", "", event -> {
                queries[0]++; check(balance[0] == 3, "Timing queried after payment");
                var data = com.google.gson.JsonParser.parseString(event.data()).getAsJsonObject();
                check(data.get("baseCooldown").getAsInt() == 120 && data.get("action").getAsString().equals(ACTION), "Missing authored duration");
                data.addProperty("cooldown", 80); event.data(data.toString());
            });
            content.complete(true); var runtime = new ActionRuntime(host, content); runtime.start(ACTION, actor, target, null);
            check(queries[0] == 1 && runtime.cooldown(actor, ACTION) == 80 && balance[0] == 2 && host.errors == 0, "Cooldown finalization lost or doubled");
        });
        scenario("invalid cooldown query refuses before paying costs and long finite durations remain valid", () -> {
            for (String result : List.of("-1", "0.5", "null", "40000")) {
                var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
                host.actors.addAll(List.of(actor, target)); host.target = target;
                var content = new ContentRegistry(); content.begin(); int[] balance = {3};
                content.register(content.epoch(), ACTION, "1", 20, action -> {
                    action.cost(cost("resource", balance, 1, () -> {})); action.commit(20); action.finish();
                });
                content.hooks().register(content.epoch(), "checks:timing", "world_combat:cooldown", "", event -> event.data("{\"cooldown\":" + result + "}"));
                content.complete(true); var runtime = new ActionRuntime(host, content);
                boolean valid = result.equals("40000");
                if (valid) runtime.start(ACTION, actor, target, null);
                else rejected(() -> runtime.start(ACTION, actor, target, null));
                check(balance[0] == (valid ? 2 : 3) && runtime.cooldown(actor, ACTION) == (valid ? 40000 : 0), "Invalid duration paid resources or finite duration was capped");
            }
        });
        scenario("retargeted input retires original selection liveness but retains its readable data", () -> {
            var fixture = new Fixture(action -> {
                String original = action.control();
                action.retarget("self", null, action.origin(), new Point(0, 0, 2), 0);
                action.after(1, next -> {
                    check(next.control().equals(original) && next.target().equals(next.actor()) && next.range() == 0,
                        "Retarget changed original selections or zero-range self semantics");
                    check(next.direction().equals(new Point(0, 0, 1)), "Retarget lost the explicit direction");
                    next.commit(8); next.finish();
                });
            }, "{\"input\":{\"version\":1,\"steps\":[\"entity\"]}}");
            fixture.start(); fixture.host.actors.remove(fixture.target); fixture.runtime.tick(); fixture.empty();
            check(fixture.host.commitments == 1 && fixture.host.errors == 0, "Original structured selection retained its target dependency");
        });
        scenario("retargeting tracks the replacement entity and validates it again before payment", () -> {
            for (boolean tick : new boolean[] {false, true}) {
                ActionContext[] current = new ActionContext[1]; int[] balance = {3};
                var replacement = handle(UUID.randomUUID(), 2);
                var fixture = new Fixture(action -> {
                    current[0] = action; action.cost(cost("resource", balance, 1, () -> {}));
                    action.retarget("enemy", replacement, new Point(1, 0, 0), new Point(1, 0, 0), 8);
                });
                fixture.host.actors.add(replacement); fixture.start(); fixture.host.actors.remove(replacement);
                if (tick) fixture.runtime.tick();
                else fixture.runtime.invoke(current[0], action -> action.commit(8));
                fixture.empty();
                check(balance[0] == 3 && fixture.host.commitments == 0 && fixture.host.errors == 0,
                    "Departed replacement target consumed resources");
                check(fixture.runtime.state(fixture.actor).reason().equals("target-left"), "Replacement lost its departure reason");
            }
        });
        scenario("authoritative interruption releases leases and action effects despite cooperative listeners", () -> {
            var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(actor, target)); host.target = target;
            var content = new ContentRegistry(); content.begin(); int[] cleaned = {0}; ActionContext[] held = new ActionContext[1];
            content.effects().effect(content.epoch(), "checks:owned", 1, 20, "action", json -> json, (version, json) -> json);
            content.effects().handler(content.epoch(), "checks:owned", "start", effect -> effect.schedule("deferred", "deferred", 1, "{}"));
            content.effects().handler(content.epoch(), "checks:owned", "deferred", effect -> { throw new AssertionError("Interrupted effect timer resumed"); });
            content.register(content.epoch(), "checks:owned_action", "1", 20, action -> {
                held[0] = action; action.commit(8);
                action.world().lease(actor, () -> cleaned[0]++);
                action.effect("checks:owned", actor, "{}", 10);
                action.on("checks:request", ignored -> {});
                action.after(1, ignored -> { throw new AssertionError("Interrupted action timer resumed"); });
            });
            content.complete(true); var runtime = new ActionRuntime(host, content);
            runtime.start("checks:owned_action", actor, target, null);
            runtime.defer(held[0], ignored -> { throw new AssertionError("Interrupted native callback resumed"); });
            check(runtime.deliver(actor, "checks:request") && runtime.busy(actor), "Cooperative event changed authoritative semantics");
            var caller = new WorldAccess(runtime, target, null, () -> {}, true, 0);
            check(caller.interrupt(actor, "checks:interruption"), "Unconditional interruption was vetoed");
            runtime.tick();
            check(cleaned[0] == 1 && host.leases.isEmpty() && runtime.effects().stats().active() == 0 && runtime.effects().stats().timers() == 0
                && runtime.stats().tasks() == 0 && runtime.stats().listeners() == 0 && !runtime.busy(actor) && host.errors == 0,
                "Interruption did not retire all action-owned work");
        });
        scenario("interruption retires preparation and committed callbacks with transaction boundaries intact", () -> {
            for (boolean committed : new boolean[] {false, true}) {
                int[] balance = {3}; ActionContext[] retained = new ActionContext[1];
                var fixture = new Fixture(ctx -> {
                    retained[0] = ctx; ctx.cost(cost("resource", balance, 1, () -> {}));
                    if (committed) ctx.commit(9);
                    ctx.after(1, next -> { throw new AssertionError("Interrupted callback resumed"); });
                });
                fixture.start();
                var observer = new WorldAccess(fixture.runtime, fixture.target, null, () -> {}, false, 0);
                rejected(() -> observer.interrupt(fixture.actor, "checks:interruption"));
                var caller = new WorldAccess(fixture.runtime, fixture.target, null, () -> {}, true, 0);
                check(caller.interrupt(fixture.actor, "checks:interruption"), "Active action did not end");
                check(!caller.interrupt(fixture.actor, "checks:interruption"), "Idle action reported interruption");
                fixture.empty(); fixture.runtime.tick();
                check(balance[0] == (committed ? 2 : 3), "Interruption changed settled resources");
                check(fixture.runtime.cooldown(fixture.actor, ACTION) == (committed ? 8 : 0), "Interruption changed cooldown settlement");
                check(fixture.host.releases == 1 && fixture.host.errors == 0, "Interruption skipped or repeated cleanup");
                check(fixture.runtime.state(fixture.actor).reason().equals("checks:interruption"), "Interruption lost its reason");
                rejected(retained[0]::origin);
            }
        });
        scenario("interruption during a resource write rolls back and stale generations cannot interrupt", () -> {
            Fixture[] ref = new Fixture[1]; int[] balance = {3};
            ref[0] = new Fixture(ctx -> {
                var stale = new ActorHandle(ctx.actor().domain(), ctx.actor().identity(), ctx.actor().entity(), 2);
                check(!ref[0].runtime.interrupt(stale, "checks:interruption"), "Foreign binding interrupted current action");
                ctx.cost(cost("resource", balance, 1, () -> ref[0].runtime.interrupt(ctx.actor(), "checks:interruption")));
                ctx.commit(9);
            });
            var fixture = ref[0]; fixture.start(); fixture.empty();
            check(balance[0] == 3 && fixture.host.commitments == 0 && fixture.runtime.cooldown(fixture.actor, ACTION) == 0,
                "Interrupted transaction committed a partial write");
        });
        scenario("preparation retargeting changes category and dependency across deferred callbacks", () -> {
            int[] balance = {3}; var direction = new Point(0, 1, 0); var point = new Point(3, 0, 0);
            var fixture = new Fixture(ctx -> {
                ctx.cost(cost("resource", balance, 1, () -> {}));
                ctx.retarget("point", null, point, direction, 8);
                rejected(() -> ctx.retarget("enemy", ctx.actor(), point, direction, 8));
                rejected(() -> ctx.retarget("point", null, point, direction, 33));
                check(ctx.target() == null && ctx.targetKind().equals("point") && ctx.range() == 8, "Rejected retarget changed the input");
                ctx.after(1, next -> {
                    check(next.targetPosition().equals(point) && next.direction().equals(direction), "Deferred target was lost");
                    next.commit(9);
                    rejected(() -> next.retarget("self", next.actor(), point, direction, 0));
                    next.finish();
                });
            });
            fixture.start(); fixture.host.actors.remove(fixture.target); fixture.runtime.tick(); fixture.empty();
            check(fixture.host.errors == 0 && balance[0] == 2 && fixture.host.commitments == 1,
                "New input retained old target dependency or changed payment");
        });
        scenario("point input can select a living target without creating another action", () -> {
            var host = new Host(); var source = handle(UUID.randomUUID(), 1); var target = handle(UUID.randomUUID(), 1);
            host.actors.addAll(List.of(source, target)); host.target = target;
            var content = new ContentRegistry(); content.begin();
            content.registerAction(content.epoch(), "checks:selection", "1", 20, "*", "point", 16, action -> {
                action.retarget("enemy", target, host.position(target), new Point(1, 0, 0), 8);
                action.commit(9); action.finish();
            });
            content.hooks().register(content.epoch(), "checks:selection_gate", "world_combat:before_commit", "", event -> {
                check(event.target().equals(target) && event.action().targetKind().equals("enemy"), "Commit gate observed original input");
            });
            content.complete(true); var runtime = new ActionRuntime(host, content);
            runtime.start("checks:selection", source, ActionTarget.point(new Point(1, 0, 0), new Point(1, 0, 0)), null);
            check(host.commitments == 1 && host.errors == 0 && runtime.cooldown(source, "checks:selection") == 9,
                "Retargeting created an independent transaction");
        });
        scenario("bounded presentation receipt uses the committed scope and rejects expired/read-only handles", () -> {
            WorldAccess[] retained = new WorldAccess[1];
            var fixture = new Fixture(ctx -> {
                ctx.commit(1); var world = ctx.world(); retained[0] = world;
                world.presentFor("checks:flight/1", "checks:motion", 1, new Point(1,0,0), "{\"birth\":[1,0,0,0]}", 16);
                rejected(() -> world.presentFor("checks:bad", "checks:motion", 1, new Point(1,0,0), "{}", 0));
                rejected(() -> world.presentFor("checks:bad", "checks:motion", 1, new Point(1,0,0), "{}", 201));
                rejected(() -> ctx.sense().presentFor("checks:bad", "checks:motion", 1, new Point(1,0,0), "{}", 16));
                ctx.finish();
            });
            fixture.start(); fixture.empty();
            check(fixture.host.errors == 0 && fixture.host.receipts == 1 && fixture.host.receiptTicks == 16 && fixture.host.receiptData.contains("birth"), "Receipt lost scope or lease data");
            rejected(() -> retained[0].presentFor("checks:bad", "checks:motion", 1, new Point(1,0,0), "{}", 16));
        });
        scenario("native damage and health accept large finite amounts through public action and world paths", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.commit(1);
                var world = ctx.world();
                check(world.hurt(ctx.target(), 4096, "{}"), "Large world damage rejected");
                check(world.health(ctx.target(), 8192, "checks:heal") == 8192, "Large healing truncated");
                check(world.health(ctx.target(), -4096, "checks:cost") == -4096, "Large health cost truncated");
                world.helper(new Point(1, 0, 0), 1024, "{}", 20);
                var impact = ctx.trace(new Point(0, 0, 0), new Point(2, 0, 0), .1);
                check(ctx.hit(impact, 16384, "large"), "Large committed strike rejected");
                ctx.finish();
            });
            fixture.start(); fixture.empty();
            check(fixture.host.errors == 0 && fixture.host.damage == 2 && fixture.host.lastDamage == 16384
                && fixture.host.lastHealth == -4096 && fixture.host.lastHelperHealth == 1024, "Native amounts were silently capped");
        });
        scenario("native amounts reject invalid values and treat zero damage or health changes as no-ops", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.commit(1); var world = ctx.world();
                for (double invalid : new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY,
                    (double) Float.MAX_VALUE * 2, -(double) Float.MAX_VALUE * 2, Double.MIN_VALUE, -Double.MIN_VALUE}) {
                    rejected(() -> world.hurt(ctx.target(), invalid, "{}"));
                    rejected(() -> world.health(ctx.target(), invalid, "checks:health"));
                    rejected(() -> world.helper(new Point(1, 0, 0), invalid, "{}", 20));
                    var impact = ctx.trace(new Point(0, 0, 0), new Point(2, 0, 0), .1);
                    rejected(() -> ctx.hit(impact, invalid, "invalid"));
                }
                check(!world.hurt(ctx.target(), 0, "{}") && world.health(ctx.target(), 0, "checks:health") == 0,
                    "Zero amount was not a harmless no-op");
                check(!ctx.hit(ctx.trace(new Point(0, 0, 0), new Point(2, 0, 0), .1), 0, "zero"), "Zero impact caused damage");
                rejected(() -> world.helper(new Point(1, 0, 0), 0, "{}", 20));
                rejected(() -> world.hurt(ctx.target(), -1, "{}"));
                check(world.hurt(ctx.target(), Float.MAX_VALUE, "{}"), "Maximum finite native float rejected");
                ctx.finish();
            });
            fixture.start(); fixture.empty();
            check(fixture.host.errors == 0 && fixture.host.damage == 1 && fixture.host.lastDamage == Float.MAX_VALUE,
                "Invalid amounts reached native host or valid boundary failed");
        });
        scenario("self actions use the source and preserve direction independently of a pointed remote target", () -> {
            var host = new Host(); var actor = handle(UUID.randomUUID(), 1); var remote = handle(UUID.randomUUID(), 1);
            host.actors.add(actor); host.target = remote;
            var content = new ContentRegistry(); content.begin();
            content.registerAction(content.epoch(), "checks:self", "1", 20, "*", "self", 1, action -> {
                check(action.target().equals(actor), "Self action kept an external target");
                check(action.targetPosition().equals(host.position(actor)), "Self action used the cursor location");
                check(action.direction().equals(new Point(1, 0, 0)), "Self action lost the requested direction");
                action.commit(1); action.finish();
            });
            content.complete(true); var runtime = new ActionRuntime(host, content);
            runtime.start("checks:self", actor, ActionTarget.entity(remote, new Point(100, 0, 0), new Point(1, 0, 0)), null);
            check(host.commitments == 1 && host.errors == 0, "Self action failed without a selectable world target");
        });
        scenario("target release is unavailable before commitment and departure keeps preparation free", () -> {
            int[] balance = {2};
            var fixture = new Fixture(ctx -> {
                rejected(ctx::releaseTarget);
                ctx.cost(cost("energy", balance, 1, () -> {}));
                ctx.after(2, next -> next.commit(8));
            });
            fixture.start(); fixture.host.actors.remove(fixture.target); fixture.runtime.tick(); fixture.empty();
            check(balance[0] == 2 && fixture.host.commitments == 0, "Departing preparation target paid a cost");
            check(fixture.runtime.state(fixture.actor).reason().equals("target-left"), "Preparation lost its departure reason");
        });
        scenario("explicitly released target retains its observed point through committed follow-up", () -> {
            Fixture[] holder = new Fixture[1];
            int[] balance = {2}, followups = {0};
            holder[0] = new Fixture(ctx -> {
                var observed = ctx.targetPosition(); ctx.cost(cost("energy", balance, 1, () -> {})); ctx.commit(8);
                holder[0].host.actors.remove(ctx.target());
                ctx.releaseTarget(); ctx.releaseTarget();
                check(ctx.target().equals(holder[0].target) && ctx.targetPosition().equals(observed), "Original target fact or last point was lost");
                ctx.stage("recovering");
                ctx.after(2, next -> { check(next.targetPosition().equals(observed), "Released point changed"); followups[0]++; next.finish(); });
            });
            var fixture = holder[0]; fixture.start(); fixture.runtime.cancelTarget(fixture.target, "native-capture");
            check(fixture.runtime.busy(fixture.actor), "Released target cancelled unrelated follow-up");
            fixture.runtime.tick(); fixture.runtime.tick(); fixture.empty();
            check(balance[0] == 1 && followups[0] == 1 && fixture.runtime.state(fixture.actor).stage().equals("finished"), "Committed follow-up or once-only payment was skipped");
        });
        scenario("committed target dependency remains until content explicitly releases it", () -> {
            var fixture = new Fixture(ctx -> { ctx.commit(8); ctx.after(2, ignored -> { throw new AssertionError("Unreleased target follow-up ran"); }); });
            fixture.start(); fixture.host.actors.remove(fixture.target); fixture.runtime.tick(); fixture.empty();
            check(fixture.runtime.state(fixture.actor).reason().equals("target-left"), "Unreleased committed action survived target departure");
        });
        scenario("target release preserves source lifetime and ended-scope guards", () -> {
            ActionContext[] held = new ActionContext[1];
            var fixture = new Fixture(ctx -> { held[0] = ctx; ctx.commit(8); ctx.releaseTarget(); ctx.after(2, ignored -> { throw new AssertionError("Absent actor continued"); }); });
            fixture.start(); fixture.host.actors.remove(fixture.actor); fixture.runtime.tick(); fixture.empty();
            check(fixture.runtime.state(fixture.actor).reason().equals("actor-left"), "Target release retained an unavailable source");
            rejected(held[0]::releaseTarget);
        });
        scenario("structured selection schema rejects malformed references before resource payment", () -> {
            String spec = "{\"input\":{\"version\":1,\"steps\":[\"point\"],\"sustained\":true}}";
            var fixture = new Fixture(ctx -> ctx.commit(1), spec);
            // A selection-free cast (scripts, companions) takes the declared steps from its target instead of being rejected.
            long implied = fixture.runtime.start(ACTION, fixture.actor, ActionTarget.entity(fixture.target, new Point(2,0,0), new Point(1,0,0)), null, Map.of(ActionInput.KEY, "{}"));
            check(implied > 0 && fixture.host.commitments == 1, "Implied selection did not start the action");
            fixture.runtime.cancelActor(fixture.actor, "test"); fixture.host.commitments = 0;
            for (String input : List.of("{\"version\":1,\"token\":1,\"samples\":[]}",
                "{\"version\":1.5,\"token\":1,\"samples\":[{\"kind\":\"point\",\"point\":[2,0,0]}]}",
                "{\"version\":1,\"token\":1,\"samples\":[{\"kind\":\"point\",\"point\":[999,0,0]}]}")) {
                rejected(() -> fixture.runtime.start(ACTION, fixture.actor, ActionTarget.entity(fixture.target, new Point(2,0,0), new Point(1,0,0)), null, Map.of(ActionInput.KEY, input)));
            }
            check(fixture.host.commitments == 0 && fixture.host.errors == 0, "Bad input paid or disabled content"); fixture.empty();
            rejected(() -> ActionInput.parse("{\"version\":1,\"token\":0,\"samples\":[{\"kind\":\"entity\",\"point\":[2,0,0],\"ref\":\"------------------------------------/1\"}]}", new ActionInput.Spec(List.of("entity"), false)));
        });
        scenario("sustained input uses ownership and instance tokens and expires after lost updates", () -> {
            ActionContext[] action = new ActionContext[1];
            var fixture = new Fixture(ctx -> { action[0] = ctx; ctx.commit(1); }, "{\"input\":{\"version\":1,\"steps\":[\"point\"],\"sustained\":true}}");
            String input = "{\"version\":1,\"token\":9,\"samples\":[{\"kind\":\"point\",\"point\":[2,0,0]}]}";
            fixture.runtime.start(ACTION, fixture.actor, ActionTarget.entity(fixture.target, new Point(2,0,0), new Point(1,0,0)), null, Map.of(ActionInput.KEY, input));
            check(!fixture.runtime.control(fixture.actor, UUID.randomUUID(), 9, input, true), "Foreign input accepted");
            check(!fixture.runtime.control(fixture.actor, null, 8, input, true), "Old input accepted");
            for (int i = 0; i < 10; i++) fixture.runtime.tick();
            check(fixture.runtime.control(fixture.actor, null, 9, input.replace("[2,0,0]", "[3,0,0]"), false), "Valid update refused");
            check(action[0].control().contains("[3,0,0]"), "Latest geometry not visible to content");
            for (int i = 0; i < 16; i++) fixture.runtime.tick();
            check(fixture.runtime.state(fixture.actor).reason().equals("input-timeout") && fixture.host.commitments == 1, "Lost input retained action or repaid cost");
            check(!fixture.runtime.control(fixture.actor, null, 9, input, false), "Ended input resurrected action"); fixture.empty();
        });
        scenario("script action data is shared across callbacks and expires with its owner", () -> {
            ActionContext[] retained = new ActionContext[1];
            var fixture = new Fixture(ctx -> {
                retained[0] = ctx; ctx.data("checks:state", "{\"value\":7}");
                rejected(() -> ctx.data("checks:bad", "undefined"));
                for (int i = 0; i < 15; i++) ctx.data("checks:key" + i, "{}");
                ctx.data("checks:additional", "{}");
                ctx.after(1, next -> {
                    check(next.data("checks:state").contains("7"), "Deferred callback lost its script state");
                    next.data("checks:state", "{\"value\":8}"); next.finish();
                });
            });
            fixture.start(); fixture.runtime.tick(); fixture.empty();
            rejected(() -> retained[0].data("checks:state"));
        });
        scenario("world observations are read-only and callback scopes expire", () -> {
            var fixture = new Fixture(ctx -> {});
            var content = fixture.content; content.begin();
            WorldAccess[] retained = new WorldAccess[1];
            content.hooks().register(content.epoch(), "checks:observation", "checks:fact", "", event -> {
                retained[0] = event.world();
                rejected(() -> event.world().health(event.actor(), 1, "checks:heal"));
                event.data("{\"observed\":true}");
            });
            content.complete(true);
            var result = fixture.runtime.event("checks:fact", fixture.actor, fixture.target, "{}", false);
            check(result.rejection().isEmpty() && result.data().contains("true"), "Read-only event failed");
            rejected(() -> retained[0].tick());
        });
        scenario("long traces are walked in pieces; only the overall bound and the radius sign are rejected", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.commit(5);
                var end = new Point(1, 2, 3).unit().scale(4);
                ctx.trace(new Point(0, 0, 0), end, 0.1);
                ctx.trace(new Point(0, 0, 0), end.scale(1.01), 0.1);
                ctx.trace(new Point(0, 0, 0), end.scale(4), 1.6);
                rejected(() -> ctx.trace(new Point(0, 0, 0), end.scale(17), 0.1));
                rejected(() -> ctx.trace(new Point(0, 0, 0), end, -0.1));
                ctx.finish();
            });
            fixture.start(); fixture.empty(); check(fixture.host.errors == 0, "Valid diagonal trace disabled its content");
        });
        scenario("cancel before commitment", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.on("signal", ignored -> { throw new AssertionError("Cancelled listener ran"); });
                ctx.after(2, next -> { throw new AssertionError("Cancelled task ran"); });
            });
            fixture.start(); fixture.runtime.cancelActor(fixture.actor, "recall");
            fixture.runtime.tick(); fixture.runtime.tick(); fixture.empty();
            check(fixture.runtime.cooldown(fixture.actor, ACTION) == 0, "Cancelled windup spent cooldown");
        });
        scenario("committed cooldown survives a new entity generation", () -> {
            var fixture = new Fixture(ctx -> { ctx.commit(4); ctx.after(2, ActionContext::finish); });
            fixture.start(); fixture.runtime.cancelActor(fixture.actor, "recall"); fixture.host.actors.remove(fixture.actor);
            var returned = handle(fixture.actor.identity(), 2); fixture.host.actors.add(returned);
            rejected(() -> fixture.runtime.start(ACTION, returned, fixture.target, null));
            for (int tick = 0; tick < 4; tick++) fixture.runtime.tick();
            fixture.runtime.start(ACTION, returned, fixture.target, null);
            check(fixture.runtime.stats().instances() == 1, "Actor could not cast after cooldown elapsed");
            fixture.runtime.stop(); fixture.empty();
            check(fixture.runtime.stats().cooldowns() == 0, "Server stop retained cooldowns");
        });
        scenario("body sweep bounds, commitment and action-owned contact receipts", () -> {
            var fixture = new Fixture(ctx -> {
                rejected(() -> ctx.moveSweep(new Point(1, 0, 0), .2));
                ctx.commit(5);
                rejected(() -> ctx.moveSweep(new Point(4.1, 0, 0), .2));
                rejected(() -> ctx.moveSweep(new Point(Double.NaN, 0, 0), .2));
                rejected(() -> ctx.moveSweep(new Point(1, 0, 0), Double.POSITIVE_INFINITY));
                rejected(() -> ctx.moveSweep(new Point(1, 0, 0), -.1));
                var issued = ctx.moveSweep(new Point(1, 0, 0), .2);
                check(!ctx.damage(new Impact(issued.position(), issued.target(), false), 3), "Forged sweep contact settled");
                check(ctx.damage(issued, 3), "Issued sweep contact did not settle");
                check(!ctx.damage(issued, 3), "Sweep contact settled twice");
                ctx.finish();
                rejected(() -> ctx.moveSweep(new Point(1, 0, 0), .2));
            });
            fixture.start(); fixture.empty();
            check(fixture.host.damage == 1 && fixture.host.errors == 0, "Body sweep receipt lifecycle failed");
        });
        scenario("trace ownership and repeated settlement", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.commit(5);
                var issued = ctx.trace(ctx.origin(), ctx.targetPosition(), 0);
                var forged = new Impact(issued.position(), issued.target(), false);
                check(!ctx.damage(forged, 3), "Foreign trace settled");
                check(ctx.damage(issued, 3), "Issued impact failed");
                check(!ctx.damage(issued, 3), "Repeated impact settled");
                var second = ctx.trace(ctx.origin(), ctx.targetPosition(), 0);
                check(!ctx.damage(second, 3), "Same victim settled twice in one action");
                ctx.finish();
            });
            fixture.start(); fixture.empty(); check(fixture.host.damage == 1, "Damage count differs");
        });
        scenario("target departure is cancellation, not broken content", () -> {
            var fixture = new Fixture(ctx -> ctx.after(1, next -> next.targetPosition()));
            fixture.start(); fixture.host.actors.remove(fixture.target); fixture.runtime.tick(); fixture.empty();
            check(fixture.content.get(ACTION) != null && fixture.host.errors == 0, "Target departure disabled content");
        });
        scenario("reload rejects retained callbacks and clears scopes", () -> {
            var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> { held[0] = ctx; ctx.on("signal", ignored -> {}); ctx.after(1, ignored -> {}); });
            fixture.start();
            fixture.content.begin(); fixture.runtime.reset("reload");
            rejected(() -> held[0].after(1, ignored -> {}));
            fixture.content.complete(false); fixture.empty();
            rejected(fixture::start);
            fixture.content.begin();
            fixture.content.register(fixture.content.epoch(), ACTION, "next", 10, ActionContext::finish);
            fixture.content.complete(true); fixture.start(); fixture.empty();
        });
        scenario("script exception ends its instance; repeated failures isolate the content", () -> {
            var fixture = new Fixture(ctx -> { ctx.on("signal", ignored -> {}); throw new IllegalStateException("script fixture"); });
            for (int failure = 1; failure < ContentRegistry.FAILURE_LIMIT; failure++) {
                rejected(fixture::start); fixture.empty();
                check(fixture.content.get(ACTION) != null && fixture.host.errors == failure, "A single bad cast disabled the move");
            }
            rejected(fixture::start); fixture.empty();
            check(fixture.content.get(ACTION) == null && fixture.host.errors == ContentRegistry.FAILURE_LIMIT, "Repeated failures left the content usable");
        });
        scenario("recursive events stop within the instance budget", () -> {
            var fixture = new Fixture(ctx -> { ctx.on("loop", next -> next.emit("loop")); ctx.emit("loop"); });
            rejected(fixture::start); fixture.empty();
            check(fixture.host.errors == 1, "Recursive event did not terminate cleanly");
        });
        scenario("wrong actor domain is rejected before script execution", () -> {
            var fixture = new Fixture(ActionContext::finish);
            fixture.content.begin();
            fixture.content.registerForDomain(fixture.content.epoch(), ACTION, "test", 10, "another", ActionContext::finish);
            fixture.content.complete(true);
            rejected(fixture::start); fixture.empty();
            check(fixture.content.get(ACTION) != null && fixture.host.errors == 0, "Invalid input disabled content");
        });
        scenario("actor leaving during a callback does not disable its content", () -> {
            Fixture[] holder = new Fixture[1];
            holder[0] = new Fixture(ctx -> { holder[0].host.actors.remove(ctx.actor()); ctx.finish(); });
            holder[0].start(); holder[0].empty();
            check(holder[0].content.get(ACTION) != null && holder[0].host.errors == 0, "Departure disabled content");
        });
        scenario("off cancels a listener during dispatch", () -> {
            var fixture = new Fixture(ctx -> {
                int[] late = {0};
                ctx.on("signal", next -> next.off(late[0]));
                late[0] = ctx.on("signal", ignored -> { throw new AssertionError("Removed listener executed"); });
                ctx.emit("signal"); ctx.finish();
            });
            fixture.start(); fixture.empty();
        });
        scenario("invalid geometry and wrong-thread calls have no side effects", () -> {
            var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> held[0] = ctx);
            fixture.start();
            rejected(() -> new Point(Double.NaN, 0, 0));
            final boolean[] rejected = {false};
            Thread thread = new Thread(() -> {
                try { held[0].after(1, ignored -> {}); }
                catch (IllegalStateException expected) { rejected[0] = true; }
            });
            thread.start();
            try { thread.join(); } catch (InterruptedException error) { throw new RuntimeException(error); }
            check(rejected[0] && fixture.runtime.stats().tasks() == 0, "Off-thread task was accepted");
            fixture.runtime.stop(); fixture.empty();
        });
        scenario("structured targets and invalid replacement preserve the active action", () -> {
            var fixture = new Fixture(ctx -> ctx.after(3, ActionContext::finish));
            fixture.start();
            var state = fixture.runtime.state(fixture.actor);
            rejected(() -> fixture.runtime.validateInput(ACTION, fixture.actor,
                ActionTarget.point(new Point(200, 0, 0), new Point(1, 0, 0)), null));
            check(fixture.runtime.state(fixture.actor).instance() == state.instance() && fixture.runtime.busy(fixture.actor), "Invalid replacement disturbed the action");
            fixture.runtime.stop();
            fixture.content.begin();
            fixture.content.registerAction(fixture.content.epoch(), ACTION, "typed", 20, "*", "motion", 6, ctx -> {
                check(ctx.target() == null && Math.abs(ctx.targetPosition().x() - 6) < 0.001, "Direction input did not use the actor origin and range");
                ctx.finish();
            });
            fixture.content.complete(true);
            fixture.runtime.start(ACTION, fixture.actor, ActionTarget.direction(new Point(5, 0, 0)), null);
            fixture.empty();
            rejected(() -> ActionTarget.direction(new Point(Double.MAX_VALUE, 0, Double.MAX_VALUE)));
        });
        scenario("friendly self effects and wrapped gameplay refusals remain available", () -> {
            var fixture = new Fixture(ActionContext::finish);
            fixture.content.begin();
            fixture.content.registerAction(fixture.content.epoch(), ACTION, "typed", 20, "*", "friend", 8,
                ctx -> { throw new RuntimeException(new ActionRejectedException("path-blocked")); });
            fixture.content.complete(true);
            rejected(() -> fixture.runtime.start(ACTION, fixture.actor, fixture.actor, null));
            check(fixture.content.get(ACTION) != null && fixture.host.errors == 0, "Expected wrapped refusal disabled content");
            check(fixture.runtime.state(fixture.actor).reason().equals("path-blocked"), "Refusal lost its reason");
            fixture.empty();
        });
        scenario("manual replacement respects commitment boundary", () -> {
            var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> held[0] = ctx);
            fixture.start();
            check(fixture.runtime.interruptPreparation(fixture.actor), "Preparation was not replaceable");
            fixture.empty(); fixture.start(); held[0].commit(40);
            check(!fixture.runtime.interruptPreparation(fixture.actor) && fixture.runtime.busy(fixture.actor), "Committed action was replaced");
            fixture.runtime.stop(); fixture.empty();
        });
        scenario("costs wait for commitment and invalid cooldown is free", () -> {
            int[] balance = {5};
            var fixture = new Fixture(ctx -> { ctx.cost(cost("energy", balance, 2, () -> {})); ctx.after(5, next -> next.commit(4)); });
            fixture.start(); fixture.runtime.interruptPreparation(fixture.actor);
            check(balance[0] == 5 && fixture.runtime.cooldown(fixture.actor, ACTION) == 0, "Preparation consumed a resource");
            fixture.empty();
            var invalid = new Fixture(ctx -> { ctx.cost(cost("energy", balance, 2, () -> {})); ctx.commit(-1); });
            rejected(invalid::start);
            check(balance[0] == 5 && invalid.runtime.cooldown(invalid.actor, ACTION) == 0, "Invalid cooldown consumed a resource");
        });
        scenario("zero cooldown commits costs and permits the next independent action", () -> {
            int[] balance = {5};
            var fixture = new Fixture(ctx -> { ctx.cost(cost("energy", balance, 2, () -> {})); ctx.commit(0); ctx.finish(); });
            fixture.start(); fixture.start();
            check(balance[0] == 1 && fixture.host.commitments == 2 && fixture.host.errors == 0,
                "Zero cooldown skipped payment or prevented the next action");
            check(fixture.runtime.stats().cooldowns() == 0, "Zero cooldown retained a dead cooldown record");
            fixture.empty();
        });
        scenario("all costs validate before any payment", () -> {
            int[] first = {5}, second = {0};
            var fixture = new Fixture(ctx -> {
                ctx.cost(cost("first", first, 2, () -> {})); ctx.cost(cost("second", second, 1, () -> {})); ctx.commit(4);
            });
            rejected(fixture::start); fixture.empty();
            check(first[0] == 5 && second[0] == 0 && fixture.runtime.cooldown(fixture.actor, ACTION) == 0, "Partial preflight payment");
            check(fixture.content.get(ACTION) != null, "Insufficient resource disabled content");
        });
        scenario("failed writes roll back every attempted resource", () -> {
            int[] first = {5}, second = {4};
            var fixture = new Fixture(ctx -> {
                ctx.cost(cost("first", first, 2, () -> {}));
                ctx.cost(cost("second", second, 1, () -> { throw new IllegalStateException("after-write fixture"); })); ctx.commit(4);
            });
            rejected(fixture::start); fixture.empty();
            check(first[0] == 5 && second[0] == 4 && fixture.runtime.cooldown(fixture.actor, ACTION) == 0, "Failed transaction retained payment");
        });
        scenario("committed resources settle once and survive cancellation", () -> {
            int[] balance = {5}; var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> { held[0] = ctx; ctx.cost(cost("energy", balance, 2, () -> {})); ctx.commit(4); });
            fixture.start(); rejected(() -> held[0].commit(4));
            fixture.runtime.cancelActor(fixture.actor, "recall"); fixture.empty();
            rejected(() -> held[0].cost(cost("late", balance, 1, () -> {})));
            check(balance[0] == 3 && fixture.runtime.cooldown(fixture.actor, ACTION) == 4, "Commit repeated or cancellation refunded payment");
        });
        scenario("reentrant commits and action invalidation roll back payment", () -> {
            int[] balance = {5};
            var recursive = new Fixture(ctx -> { ctx.cost(cost("energy", balance, 2, () -> ctx.commit(4))); ctx.commit(4); });
            rejected(recursive::start); recursive.empty(); check(balance[0] == 5, "Recursive payment survived");
            Fixture[] holder = new Fixture[1];
            holder[0] = new Fixture(ctx -> {
                ctx.cost(cost("energy", balance, 2, () -> holder[0].runtime.cancelActor(ctx.actor(), "left-during-commit"))); ctx.commit(4);
            });
            holder[0].start(); holder[0].empty();
            check(balance[0] == 5 && holder[0].runtime.cooldown(holder[0].actor, ACTION) == 0, "Invalidated commit consumed resources");
            check(holder[0].content.get(ACTION) != null, "Lifecycle cancellation disabled content");
        });
        scenario("server action arguments are immutable values", () -> {
            var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> held[0] = ctx);
            var values = new HashMap<String, String>(); values.put("selection", "first");
            fixture.runtime.start(ACTION, fixture.actor, ActionTarget.entity(fixture.target, new Point(2, 0, 0), new Point(1, 0, 0)), null, values);
            values.put("selection", "second");
            check(held[0].argument("selection").equals("first") && held[0].argument("missing") == null, "Input values changed after dispatch");
            fixture.runtime.stop(); fixture.empty();
        });
        scenario("rollback failure is reported as a content error", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.cost(new CommitCost() {
                    public String key() { return "broken-host"; }
                    public void prepare(ActionContext action) {}
                    public void apply() { throw new ActionRejectedException("refused"); }
                    public void rollback() { throw new IllegalStateException("rollback fixture"); }
                });
                ctx.commit(4);
            });
            rejected(fixture::start); fixture.empty();
            check(fixture.host.errors == 1 && fixture.content.get(ACTION) != null, "Rollback failure was treated as a gameplay refusal");
        });
        scenario("domain commitment notification follows successful resource settlement once", () -> {
            int[] balance = {2};
            var held = new ActionContext[1];
            var fixture = new Fixture(ctx -> { held[0] = ctx; ctx.cost(cost("energy", balance, 1, () -> {})); });
            fixture.start(); fixture.runtime.interruptPreparation(fixture.actor);
            check(fixture.host.commitments == 0, "Cancellation emitted a commitment");
            fixture.start(); held[0].commit(4); rejected(() -> held[0].commit(4));
            check(balance[0] == 1 && fixture.host.commitments == 1, "Commitment notification was repeated or preceded payment");
            fixture.runtime.stop(); fixture.empty();
            var refused = new Fixture(ctx -> { ctx.cost(cost("empty", new int[]{0}, 1, () -> {})); ctx.commit(4); });
            rejected(refused::start);
            check(refused.host.commitments == 0, "Refused payment emitted a commitment");
        });
        scenario("concurrent actions and their owned resources scale past former caps", () -> {
            var fixture = new Fixture(ctx -> {
                ctx.commit(1);
                for (int i = 0; i < 150; i++) {
                    ctx.data("checks:entry_" + i, "{\"text\":\"" + "x".repeat(200) + "\"}");
                    ctx.after(2, next -> {}); ctx.on("signal", next -> {});
                }
            });
            for (int i = 0; i < 200; i++) {
                var actor = handle(UUID.randomUUID(), 1); fixture.host.actors.add(actor);
                fixture.runtime.start(ACTION, actor, fixture.target, null);
            }
            check(fixture.runtime.stats().instances() == 200 && fixture.runtime.stats().tasks() == 30000, "Former runtime capacity survived");
            fixture.runtime.tick(); fixture.runtime.tick();
            check(fixture.runtime.stats().tasks() == 0 && fixture.host.errors == 0, "Scheduled work was capped");
            fixture.runtime.stop(); fixture.empty();
        });
        scenario("large scene baselines, quiet deltas and removals", () -> {
            var values = new LinkedHashMap<String, com.google.gson.JsonObject>();
            for (int i = 0; i < 900; i++) {
                var value = new com.google.gson.JsonObject(); value.addProperty("key", "entry" + i); value.addProperty("label", "内容".repeat(25));
                values.put("entry" + i, value);
            }
            var inbox = new SceneDelta.Inbox();
            String baseline = SceneDelta.difference(Map.of(), values, true).toString();
            inbox.receive(1, baseline);
            check(com.google.gson.JsonParser.parseString(inbox.snapshot()).getAsJsonArray().size() == 900, "Scene baseline was truncated");
            check(!SceneDelta.changed(SceneDelta.difference(values, values, false)), "Unchanged state produced an update");
            var next = new LinkedHashMap<>(values); next.remove("entry4");
            var changed = next.get("entry2").deepCopy(); changed.addProperty("label", "new"); next.put("entry2", changed);
            var delta = SceneDelta.difference(values, next, false);
            check(delta.getAsJsonArray("upsert").size() == 1 && delta.getAsJsonArray("remove").size() == 1, "Delta contains unchanged entries");
            check(inbox.receive(2, delta.toString()), "Delta was not applied immediately");
            check(com.google.gson.JsonParser.parseString(inbox.snapshot()).getAsJsonArray().size() == 899 && inbox.snapshot().contains("new"), "Client did not reconstruct delta");
            check(!inbox.receive(1, baseline), "Stale packet replaced current state");
        });
        System.out.println("Runtime checks passed: " + passed);
    }
}
