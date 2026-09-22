package dev.worldcombat.core.script;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.CombatServices;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.BiFunction;
import dev.worldcombat.core.runtime.effect.EffectContext;

public final class CombatScriptApi {
    public void composition(String action, String json) { CombatServices.CONTENT.composition(epoch, action, json); }
    private final long epoch = CombatServices.CONTENT.epoch();

    public void register(String id, String version, int maxTicks, Consumer<ActionContext> callback) {
        CombatServices.CONTENT.register(epoch, id, version, maxTicks, callback);
    }
    public void registerAction(String id, String version, int maxTicks, String targetKind, double range,
                               Consumer<ActionContext> callback) {
        CombatServices.CONTENT.registerAction(epoch, id, version, maxTicks, "*", targetKind, range, callback);
    }
    public Point point(double x, double y, double z) { return new Point(x, y, z); }
    public void preview(String action, String json) { CombatServices.CONTENT.preview(epoch, action, json); }
    public void on(String id, String topic, String after, Consumer<WorldEvent> handler) {
        CombatServices.CONTENT.hooks().register(epoch, id, topic, after, handler);
    }
    public void contentPack(String id, String version, String dependencies) { CombatServices.CONTENT.effects().pack(epoch, id, version, dependencies); }
    public void effect(String id, int schema, int maxTicks, String lifetime, Function<String, String> normalize,
                       BiFunction<Integer, String, String> migrate) {
        CombatServices.CONTENT.effects().effect(epoch, id, schema, maxTicks, lifetime, normalize, migrate);
    }
    public void effectHandler(String id, String key, Consumer<EffectContext> handler) { CombatServices.CONTENT.effects().handler(epoch, id, key, handler); }
    public void event(String id, int schema, Function<String, String> normalize) { CombatServices.CONTENT.effects().event(epoch, id, schema, normalize); }
    public void phase(String event, String id, String after) { CombatServices.CONTENT.effects().phase(epoch, event, id, after); }
    /** Script-side timing: `var t = WorldCombat.clock(); ...; WorldCombat.measured("my step", t)` shows up in `/worldcombat profile`. */
    public long clock() { return dev.worldcombat.core.runtime.ScriptProfile.start(); }
    public void measured(String key, long started) { dev.worldcombat.core.runtime.ScriptProfile.end("script " + key, started); }
}
