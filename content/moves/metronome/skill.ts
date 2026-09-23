/**
 * Metronome server behaviour.
 *
 * The pool is every implemented skill carrying the native `flags.metronome` marker — the engine's
 * readable answer to "nearly any move"; the move itself and the other move-callers lack that flag,
 * as in the native data. `bias` narrows the pool before the random draw, with a full-pool fallback.
 * The borrowed move runs through NativeLoadout.call under Metronome's own PP and cooldown.
 */
namespace PokemonSkills {
    var metronomePoolCache: string[] | null = null;
    export function metronomePool(): string[] {
        if (metronomePoolCache !== null) return metronomePoolCache;
        var ids = Object.keys(skills), pool: string[] = [];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            if (id === "metronome") continue;
            if (NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.metronome) pool.push(id);
        }
        return metronomePoolCache = pool;
    }
    function metronomeEnemy(action: CombatAction, origin: CombatPoint, radius: number): { actor: CombatActor; body: CombatObservation } | null {
        var world = action.sense(), found = world.query(origin, Math.min(32, Math.max(1, radius)), false);
        var best: { actor: CombatActor; body: CombatObservation } | null = null, distance = Infinity;
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (world.friendly(actor) || !world.valid(actor)) continue;
            var body = world.observe(actor);
            if (!body) continue;
            var current = body.position().minus(origin).length();
            if (current < distance) { distance = current; best = { actor: actor, body: body }; }
        }
        return best;
    }
    function metronomeCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self" || skill.kind === "friend") input = NativeLoadout.inputFor(action, id, action.actor());
        else {
            var found = metronomeEnemy(action, action.origin(), action.range() + 2);
            if (!found) return null;
            input = NativeLoadout.inputFor(action, id, found.actor, found.body.position());
        }
        return input ? { eligibility: "caller", input: input } : null;
    }

    define({
        id: "metronome",
        cooldownParameter: "recharge",
        name: "挥指",
        description: "挥动手指刺激自己，从所有可被借出的已实装招式中随机借出一个并使出。",
        uses: ["搓指搅动招式池", "随机使出一个招式"],
        kind: "self",
        range: 16,
        maxRange: 20,
        prepare: 8,
        active: 1,
        recover: 0,
        cooldown: 100,
        style: "chaos",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["metronome"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p("metronome", "wag", context),
                recover: 0,
                cooldown: p("metronome", "recharge", context),
                active: 1,
                range: p("metronome", "span", context)
            };
        },
        run: function (action, move, config) {
            var hues = p("metronome", "hues", action);
            action.present("metronome:wag", "world_combat:move_metronome", 1, action.origin(), JSON.stringify({ moment: "wag", hues: hues }));
            action.after(p("metronome", "wag", action), function (current) {
                var ids = metronomePool();
                if (!ids.length) { current.reject("no-move"); return; }
                var bias = config && typeof config.bias === "string" ? String(config.bias) : "none";
                var preferred = ids;
                if (bias === "near" || bias === "far") preferred = ids.filter(function (id) {
                    var range = skills[id] ? skills[id].range : 0;
                    return bias === "near" ? range <= 6 : range >= 10;
                });
                var pick = function (candidate: string) { return metronomeCall(current, candidate); };
                var selection = preferred.length ? NativeLoadout.select(current, preferred, pick) : null;
                if (!selection && preferred.length !== ids.length) selection = NativeLoadout.select(current, ids, pick);
                if (!selection) { current.reject("no-move"); return; }
                current.present("metronome:draw", "world_combat:move_metronome", 1, current.origin(), JSON.stringify({ moment: "draw", hues: hues }));
                NativeLoadout.call(current, selection.id, { input: selection.options.input, eligibility: "caller", cooldown: p("metronome", "recharge", current) });
            });
        }
    });
    NativeLoadout.availableWhen("metronome", function () {
        return metronomePool().length ? "" : "no-move";
    });
}
