package dev.worldcombat.core.runtime.effect;

import dev.worldcombat.core.runtime.*;
import java.util.*;

/** Managed effect instances. Persistent values contain handler identifiers, never callbacks. */
public final class EffectRuntime {
    public record Anchor(String domain, UUID identity, String authority) {}
    public record Timer(String key, String handler, int remaining, String input) {}
    public record Listener(String event, String phase, String handler) {}
    public record Saved(long id, String definition, int schema, Anchor source, Anchor target, UUID controller,
                        int remaining, String data, List<Timer> timers, List<Listener> listeners) {}
    static final class Instance {
        long id, action;
        ExecutionOrigin origin;
        EffectRegistry.Definition definition;
        ActorHandle source, target;
        Anchor sourceAnchor, targetAnchor;
        UUID controller;
        int remaining;
        String data;
        String endReason = "";
        final Map<String, Timer> timers = new LinkedHashMap<>();
        final List<Listener> listeners = new ArrayList<>();
    }
    static final class Chain { long root; int depth; }
    static final class Frame {
        long id, parent;
        Chain chain;
        EffectRegistry.Event definition;
        ActorHandle source, target;
        String payload, reason = "";
        String phase, originKind;
        long origin;
    }
    private final CombatHost host;
    ActionRuntime actions;
    public void attach(ActionRuntime actions) { if (this.actions != null) throw new IllegalStateException("Effect runtime already attached"); this.actions = actions; }
    final EffectRegistry registry;
    final Map<Long, Instance> active = new LinkedHashMap<>();
    private final Map<Long, Saved> pending = new LinkedHashMap<>();
    private final Set<Long> failed = new HashSet<>();
    private long nextId, nextEvent, epoch;
    private int restoreClock;
    private boolean closed;
    private Frame dispatch;

    public EffectRuntime(CombatHost host, EffectRegistry registry) {
        this.host = host; this.registry = registry; epoch = registry.epoch();
    }
    public long create(String id, ActorHandle source, ActorHandle target, UUID controller, long action, String data, int ticks) {
        return create(id, source, target, controller, action, data, ticks, actions == null ? null : actions.origin(action));
    }
    public ExecutionOrigin origin(long id) {
        host.checkThread(); var instance = active.get(id);
        return instance == null ? null : instance.origin;
    }
    public long create(String id, ActorHandle source, ActorHandle target, UUID controller, long action, String data, int ticks, ExecutionOrigin origin) {
        host.checkThread(); current();
        var definition = registry.get(id);
        if (definition == null) throw new ActionRejectedException("effect-unavailable");
        permitted(source, target, controller);
        duration(definition, ticks);
        if (definition.lifetime().equals("action") && (action <= 0 || actions != null && !actions.exists(action))) throw new IllegalArgumentException("Effect requires a live action owner");
        var instance = new Instance();
        instance.id = ++nextId; instance.action = action; instance.definition = definition;
        instance.origin = origin != null && origin.belongsTo(source) ? origin : null;
        instance.source = source; instance.target = target; instance.controller = controller;
        instance.sourceAnchor = anchor(source); instance.targetAnchor = anchor(target);
        instance.data = registry.data(definition, data); instance.remaining = ticks;
        active.put(instance.id, instance);
        try { invoke(instance, "start", "{}", null, source); }
        catch (RuntimeException error) {
            active.remove(instance.id); pending.remove(instance.id);
            release(instance, "effect-failed");
            throw error;
        }
        changed(instance);
        return instance.id;
    }
    public boolean operate(long id, String operation, ActorHandle caller, UUID controller, String input) {
        host.checkThread(); current(); EffectData.id(operation);
        var instance = active.get(id);
        if (instance == null) return false;
        permitted(caller, instance.target, controller);
        String key = "operation:" + operation;
        if (!instance.definition.handlers().containsKey(key)) return false;
        invoke(instance, key, EffectData.copy(input), null, caller);
        return true;
    }
    /** Compare canonical stored snapshots, normalize all replacements, then publish after the whole set is committed. */
    public boolean compareStates(ActorHandle caller, UUID controller, String json) {
        host.checkThread(); current();
        var root = com.google.gson.JsonParser.parseString(EffectData.copy(json)).getAsJsonObject();
        if (root.size() != 1 || !root.has("updates") || !root.get("updates").isJsonArray())
            throw new IllegalArgumentException("Expected effect state updates");
        record Update(Instance instance, String expected, String requested, String replacement) {}
        var updates = new ArrayList<Update>(); var identifiers = new HashSet<Long>();
        for (var element : root.getAsJsonArray("updates")) {
            if (!element.isJsonObject()) throw new IllegalArgumentException("Expected an effect state update");
            var value = element.getAsJsonObject();
            if (value.size() != 3 || !value.has("id") || !value.has("expected") || !value.has("data")
                || !value.get("id").isJsonPrimitive() || !value.getAsJsonPrimitive("id").isNumber()
                || !value.get("expected").isJsonPrimitive() || !value.getAsJsonPrimitive("expected").isString()
                || !value.get("data").isJsonPrimitive() || !value.getAsJsonPrimitive("data").isString())
                throw new IllegalArgumentException("Invalid effect state update");
            long id = value.getAsJsonPrimitive("id").getAsBigDecimal().longValueExact();
            if (id <= 0 || !identifiers.add(id)) throw new IllegalArgumentException("Duplicate or invalid effect instance");
            updates.add(new Update(active.get(id), value.get("expected").getAsString(), value.get("data").getAsString(), null));
        }
        for (var update : updates) {
            var instance = update.instance();
            if (instance == null || !live(instance) || !instance.endReason.isEmpty()) return false;
            permitted(caller, instance.target, controller);
            if (!instance.data.equals(update.expected())) return false;
        }
        for (int i = 0; i < updates.size(); i++) {
            var update = updates.get(i);
            updates.set(i, new Update(update.instance(), update.expected(), update.requested(), registry.data(update.instance().definition, update.requested())));
        }
        // A normalizer may call other content. Recheck every original snapshot after all normalizers have returned.
        current();
        for (var update : updates) {
            var instance = update.instance();
            if (!live(instance) || !instance.endReason.isEmpty() || !instance.data.equals(update.expected())) return false;
            permitted(caller, instance.target, controller);
        }
        var modified = new ArrayList<Instance>();
        for (var update : updates) if (!update.instance().data.equals(update.replacement())) {
            update.instance().data = update.replacement(); modified.add(update.instance());
        }
        // These are subsequent observations. Reentrant observers see the complete commit and may make later changes.
        for (var instance : modified) {
            try { changed(instance); }
            catch (RuntimeException error) { host.report(-instance.id, instance.definition.id(), "Effect state committed; change observer failed", error); }
        }
        return true;
    }
    /** Publish through an effect created by this source, so its release owns the presentation too. */
    public boolean present(long id, ActorHandle caller, UUID controller, String key, String type, int version, Point point, String data) {
        host.checkThread(); current();
        var instance = active.get(id);
        if (instance == null || !live(instance) || !instance.source.equals(caller) || !instance.endReason.isEmpty()) return false;
        permitted(caller, instance.target, controller);
        host.present(-id, instance.source, key, type, version, point, data);
        return true;
    }
    public String emit(String event, int version, ActorHandle source, ActorHandle target, UUID controller, String payload) {
        return emit(event, version, source, target, controller, payload, "host", 0);
    }
    public String emit(String event, int version, ActorHandle source, ActorHandle target, UUID controller, String payload,
                       String originKind, long origin) {
        host.checkThread(); current(); permitted(source, target, controller);
        var definition = registry.event(event);
        if (definition == null || definition.schema() != version) throw new IllegalArgumentException("Event protocol unavailable: " + event + "@" + version);
        Frame previous = dispatch;
        var frame = new Frame(); frame.id = ++nextEvent; frame.parent = previous == null ? 0 : previous.id;
        frame.chain = previous == null ? new Chain() : previous.chain;
        if (previous == null) frame.chain.root = frame.id;
        if (++frame.chain.depth > 16) { frame.chain.depth--; throw new IllegalStateException("Effect event depth exceeded"); }
        frame.definition = definition; frame.source = source; frame.target = target;
        frame.originKind = originKind; frame.origin = origin;
        try {
            frame.payload = registry.data(definition, payload);
            dispatch = frame;
            for (String phase : definition.order()) {
                frame.phase = phase;
                for (var instance : List.copyOf(active.values())) {
                    if (instance.listeners.isEmpty()) continue;
                    boolean interested = false;
                    for (var listener : instance.listeners) if (listener.event().equals(event) && listener.phase().equals(phase)) { interested = true; break; }
                    if (!interested) continue;
                    if (!live(instance) || !host.sameWorld(source, instance.target)
                        || host.position(source).minus(host.position(instance.target)).length() > 64) continue;
                    for (var listener : List.copyOf(instance.listeners)) {
                        if (!live(instance) || !instance.listeners.contains(listener)) continue;
                        if (listener.event().equals(event) && listener.phase().equals(phase)) {
                            invoke(instance, listener.handler(), "{}", frame, source);
                            if (!frame.reason.isEmpty()) throw new ActionRejectedException(frame.reason);
                        }
                    }
                }
            }
            return frame.payload;
        } finally { dispatch = previous; frame.chain.depth--; }
    }
    private void permitted(ActorHandle source, ActorHandle target, UUID controller) {
        if (!host.valid(source) || !host.mayAct(source, controller)) throw new ActionInactiveException("Effect source is unavailable");
        if (!host.valid(target) || !host.sameWorld(source, target)) throw new ActionInactiveException("Effect target is unavailable");
        if (host.position(source).minus(host.position(target)).length() > 64) throw new ActionRejectedException("out-of-range");
    }
    private Anchor anchor(ActorHandle actor) { return new Anchor(actor.domain(), actor.identity(), host.controlIdentity(actor)); }
    static void duration(EffectRegistry.Definition definition, int ticks) {
        if (ticks < 1 || ticks > definition.maxTicks())
            throw new IllegalArgumentException("Effect duration " + ticks + " is outside 1.." + definition.maxTicks() + " declared by " + definition.id());
    }
    private void current() {
        if (closed || epoch != registry.epoch() || !registry.ready()) throw new ActionInactiveException("Effect content is unavailable");
    }
    boolean live(Instance instance) {
        return !closed && epoch == registry.epoch() && active.get(instance.id) == instance
            && registry.get(instance.definition.id()) == instance.definition && host.valid(instance.source)
            && host.valid(instance.target) && host.sameWorld(instance.source, instance.target)
            && host.mayAct(instance.source, instance.controller);
    }
    void require(Instance instance) {
        host.checkThread();
        if (!live(instance)) throw new ActionInactiveException("Effect callback has ended or its owner is unavailable");
    }
    void changed(Instance instance) {
        host.effectChanged(instance.target, instance.definition.id());
        if (!instance.source.equals(instance.target)) host.effectChanged(instance.source);
    }
    void invoke(Instance instance, String handler, String input, Frame event, ActorHandle caller) {
        invoke(instance, handler, input, event, caller, null, "");
    }
    private void invoke(Instance instance, String handler, String input, Frame event, ActorHandle caller, Impact impact, String projectile) {
        require(instance);
        var callback = instance.definition.handlers().get(handler);
        if (callback == null) throw new IllegalArgumentException("Unknown effect handler " + handler);
        var context = new EffectContext(this, instance, input, event, caller, impact, projectile);
        String before = event == null ? null : event.payload;
        long started = dev.worldcombat.core.runtime.ScriptProfile.start();
        try {
            callback.accept(context);
        } catch (RuntimeException error) {
            if (event != null) event.payload = before;
            Throwable cause = error;
            for (int depth = 0; cause != null && depth < 8; depth++, cause = cause.getCause()) {
                if (cause instanceof ActionInactiveException) {
                    // end() invalidates the callback immediately. Unwind any later scheduling/writes without
                    // treating a deliberately completed child effect as a failure of its spawning action.
                    if (handler.equals("start") && !instance.endReason.isEmpty() && active.get(instance.id) != instance) return;
                    suspend(instance); throw error;
                }
                if (cause instanceof ActionRejectedException) throw error;
            }
            if (registry.get(instance.definition.id()) != null) {
                registry.disable(instance.definition.id());
                for (var value : List.copyOf(active.values()))
                    if (value.definition == instance.definition) suspend(value);
                host.report(instance.id, instance.definition.id() + "@" + instance.definition.schema(), "effect-disabled", error);
            }
            throw error;
        } finally { context.close(); dev.worldcombat.core.runtime.ScriptProfile.end("effect " + instance.definition.id() + " " + handler, started); }
    }
    public void tick() {
        host.checkThread();
        if (closed) return;
        if (epoch != registry.epoch()) reload();
        if (!registry.ready()) return;
        if (restoreClock++ % 20 == 0) restorePending();
        for (var instance : List.copyOf(active.values())) {
            if (active.get(instance.id) != instance) continue;
            if (!live(instance)) { suspend(instance); continue; }
            if (--instance.remaining <= 0) { end(instance, "expired"); continue; }
            var due = new ArrayList<Timer>();
            for (var timer : List.copyOf(instance.timers.values())) {
                if (timer.remaining() <= 1) due.add(timer);
                else instance.timers.put(timer.key(), new Timer(timer.key(), timer.handler(), timer.remaining() - 1, timer.input()));
            }
            for (var timer : due) {
                if (!live(instance)) break;
                if (instance.timers.get(timer.key()) != timer) continue;
                instance.timers.remove(timer.key());
                try { invoke(instance, timer.handler(), timer.input(), null, instance.source); }
                catch (RuntimeException ignored) { break; } // invoke isolates and reports the content.
            }
        }
    }
    public String projectile(long id, Point origin, Point velocity, double gravity, double radius, double range, int lifetime,
                             String hit, String complete, String input, String appearance) {
        var instance = active.get(id);
        if (instance == null || actions == null) throw new ActionInactiveException("Projectile requires a live managed effect");
        require(instance);
        if (!instance.endReason.isEmpty()) throw new ActionInactiveException("Effect is ending");
        if (!instance.definition.handlers().containsKey(hit) || !instance.definition.handlers().containsKey(complete))
            throw new IllegalArgumentException("Unknown projectile handler");
        String payload = EffectData.copy(input);
        return actions.projectiles().spawn(-id, instance.source, instance.controller, () -> live(instance), origin, velocity, gravity, radius, range, lifetime,
            (projectile, impact) -> dispatchProjectile(instance, hit, payload, impact, projectile),
            projectile -> dispatchProjectile(instance, complete, payload, null, projectile), appearance);
    }
    private void dispatchProjectile(Instance instance, String handler, String input, Impact impact, String projectile) {
        try { invoke(instance, handler, input, null, instance.source, impact, projectile); }
        catch (RuntimeException ignored) { } // invoke reports script failures and isolates the owning definition.
    }
    private void release(Instance instance, String reason) {
        if (actions != null) actions.projectiles().release(-instance.id);
        host.release(-instance.id, reason);
    }
    void schedule(Instance instance, String key, String handler, int ticks, String input) {
        require(instance); EffectData.key(key); EffectData.key(handler);
        if (!instance.definition.handlers().containsKey(handler) || ticks < 1 || ticks > instance.definition.maxTicks())
            throw new IllegalArgumentException("Invalid effect timer");
        instance.timers.put(key, new Timer(key, handler, ticks, EffectData.copy(input)));
    }
    void listen(Instance instance, String event, String phase, String handler) {
        require(instance);
        var protocol = registry.event(event);
        if (protocol == null || !protocol.order().contains(phase) || !instance.definition.handlers().containsKey(handler))
            throw new IllegalArgumentException("Invalid effect subscription");
        var listener = new Listener(event, phase, handler);
        if (instance.listeners.contains(listener)) return;
        instance.listeners.add(listener);
    }
    void end(Instance instance) { require(instance); end(instance, "removed"); }
    private void end(Instance instance, String reason) {
        if (active.get(instance.id) != instance) return;
        if (instance.endReason.isEmpty() && live(instance)) {
            instance.endReason = reason;
            if (instance.definition.handlers().containsKey("end")) {
                try { invoke(instance, "end", "{}", null, instance.source); } catch (RuntimeException ignored) { }
            }
        }
        active.remove(instance.id); release(instance, "effect-ended"); changed(instance);
    }
    /** True while the instance is active or saved for a later restore; bodies live exactly this long. */
    public boolean exists(long id) { host.checkThread(); return active.containsKey(id) || pending.containsKey(id); }
    /** Ends an active instance or forgets a saved one, without the caller needing to be its source. */
    public void dismiss(long id) {
        host.checkThread();
        var instance = active.get(id);
        if (instance != null) end(instance, "removed"); else pending.remove(id);
    }
    public void actionEnded(long id) {
        host.checkThread();
        for (var instance : List.copyOf(active.values())) if (instance.action == id && instance.definition.lifetime().equals("action")) end(instance, "action-ended");
    }
    private Saved save(Instance instance) {
        return new Saved(instance.id, instance.definition.id(), instance.definition.schema(), instance.sourceAnchor,
            instance.targetAnchor, instance.controller, instance.remaining, instance.data,
            List.copyOf(instance.timers.values()), List.copyOf(instance.listeners));
    }
    private void suspend(Instance instance) {
        if (!active.remove(instance.id, instance)) return;
        // An instance whose time has run out (its `end` handler may be what triggered this reload) is over, not saved.
        if (instance.definition.lifetime().equals("persistent") && instance.remaining >= 1 && instance.endReason.isEmpty()) pending.put(instance.id, save(instance));
        release(instance, "effect-suspended");
        changed(instance);
    }
    public void reload() {
        host.checkThread();
        for (var instance : List.copyOf(active.values())) suspend(instance);
        active.clear(); failed.clear(); restoreClock = 0; epoch = registry.epoch();
    }
    public void stop() { reload(); closed = true; }
    public List<String> snapshot() {
        host.checkThread(); var values = new ArrayList<Saved>(pending.values());
        for (var instance : active.values()) if (instance.definition.lifetime().equals("persistent")) values.add(save(instance));
        return values.stream().map(EffectData.GSON::toJson).toList();
    }
    /** A saved entry that fails validation is reported and dropped; one bad record must not keep the world from loading. */
    public void load(List<String> values) {
        host.checkThread();
        if (!active.isEmpty() || !pending.isEmpty()) throw new IllegalArgumentException("Load effects into an empty runtime");
        var loaded = new LinkedHashMap<Long, Saved>();
        for (String json : values) {
            Saved saved;
            try {
                saved = EffectData.GSON.fromJson(json, Saved.class);
                validateSaved(saved);
            } catch (RuntimeException error) {
                host.report(0, json.length() > 200 ? json.substring(0, 200) : json, "effect-saved-invalid", error);
                continue;
            }
            if (loaded.putIfAbsent(saved.id(), saved) != null) throw new IllegalArgumentException("Duplicate saved effect");
        }
        pending.putAll(loaded);
        for (long id : loaded.keySet()) nextId = Math.max(nextId, id);
    }
    private void validateSaved(Saved saved) {
        if (saved == null || saved.id() <= 0 || saved.id() == Long.MAX_VALUE || saved.schema() < 1 || saved.remaining() < 1
            || saved.remaining() > 1200000 || saved.timers() == null || saved.listeners() == null) throw new IllegalArgumentException("Invalid saved effect");
        EffectData.id(saved.definition()); EffectData.copy(saved.data());
        for (var anchor : List.of(saved.source(), saved.target()))
            if (anchor.domain() == null || anchor.identity() == null || anchor.authority() == null || anchor.authority().length() > 256)
                throw new IllegalArgumentException("Invalid saved actor");
        for (var timer : saved.timers()) {
            EffectData.key(timer.key()); EffectData.key(timer.handler()); EffectData.copy(timer.input());
            if (timer.remaining() < 1 || timer.remaining() > 1200000) throw new IllegalArgumentException("Invalid saved timer");
        }
        for (var listener : saved.listeners()) { EffectData.id(listener.event()); EffectData.id(listener.phase()); EffectData.key(listener.handler()); }
    }
    private void restorePending() {
        for (var saved : List.copyOf(pending.values())) {
            if (failed.contains(saved.id())) continue;
            var definition = registry.get(saved.definition());
            if (definition == null) {
                if (!registry.contains(saved.definition())) pending.remove(saved.id());
                continue;
            }
            if (!definition.lifetime().equals("persistent")) { pending.remove(saved.id()); continue; }
            var source = host.findActor(saved.source().domain(), saved.source().identity());
            var target = host.findActor(saved.target().domain(), saved.target().identity());
            if (!host.valid(source) || !host.valid(target)) continue;
            if (!host.controlIdentity(source).equals(saved.source().authority()) || !host.controlIdentity(target).equals(saved.target().authority())) {
                pending.remove(saved.id()); continue;
            }
            if (!host.mayAct(source, saved.controller()) || !host.sameWorld(source, target)) continue;
            try {
                var instance = new Instance(); instance.id = saved.id(); instance.definition = definition;
                instance.source = source; instance.target = target; instance.controller = saved.controller();
                instance.sourceAnchor = saved.source(); instance.targetAnchor = saved.target();
                duration(definition, saved.remaining()); instance.remaining = saved.remaining();
                String data = saved.schema() == definition.schema() ? saved.data() :
                    definition.migrate().apply(saved.schema(), saved.data());
                instance.data = registry.data(definition, data);
                active.put(instance.id, instance);
                try {
                    for (var timer : saved.timers()) schedule(instance, timer.key(), timer.handler(), timer.remaining(), timer.input());
                    for (var listener : saved.listeners()) listen(instance, listener.event(), listener.phase(), listener.handler());
                    if (definition.handlers().containsKey("resume")) invoke(instance, "resume", "{}", null, source);
                } catch (RuntimeException error) { active.remove(instance.id); release(instance, "effect-restore-failed"); throw error; }
                pending.remove(saved.id());
                changed(instance);
            } catch (RuntimeException error) {
                failed.add(saved.id());
                host.report(saved.id(), saved.definition(), "effect-restore-held", error);
            }
        }
    }
    public Stats stats() { return new Stats(active.size(), pending.size(),
        active.values().stream().mapToInt(it -> it.timers.size()).sum(), active.values().stream().mapToInt(it -> it.listeners.size()).sum()); }
    public record Stats(int active, int paused, int timers, int listeners) {}
    public record View(long id, String definition, ActorHandle source, ActorHandle target, int remaining, String data) {}
    public View[] query(ActorHandle target, String definition) {
        host.checkThread(); current();
        // Match on target and definition first: those are field comparisons, `live` resolves entities.
        return active.values().stream().filter(it -> it.target.equals(target) && (definition.isEmpty() || it.definition.id().equals(definition)) && live(it))
              .map(it -> new View(it.id, it.definition.id(), it.source, it.target, it.remaining, it.data)).toArray(View[]::new);
    }
    /** Live effects of one definition in the observer's world; consumers choose their own spatial/state predicates. */
    public View[] queryDefinition(ActorHandle observer, String definition) {
        host.checkThread(); current(); EffectData.id(definition);
        return active.values().stream().filter(it -> it.definition.id().equals(definition) && live(it)
                && host.sameWorld(observer, it.target))
            .map(it -> new View(it.id, it.definition.id(), it.source, it.target, it.remaining, it.data)).toArray(View[]::new);
    }
    public String state(long id) { host.checkThread(); var instance = active.get(id); return instance == null ? null : instance.data; }
}
