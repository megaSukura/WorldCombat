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
    /** A live body chosen as the borrowed move's recipient or aim point. */
    interface MetronomeTarget { actor: CombatActor; body: CombatObservation; }
    /** The drawn move's own resolved range for this individual (configuration and level), or its design range. */
    function metronomeRange(world: CombatWorld, actor: CombatActor, id: string): number {
        var skill = skills[id]; if (!skill) return 0;
        if (!skill.resolve) return skill.range;
        var runtime = skill.resolve(CobblemonCombat.pokemon(actor), config(world, actor, id), world, actor);
        return runtime.range === undefined ? skill.range : runtime.range;
    }
    /** Nearest non-friendly body actually in sight within reach; a wall does not discard the whole candidate. */
    function metronomeEnemy(world: CombatWorld, origin: CombatPoint, maxDistance: number): MetronomeTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: MetronomeTarget | null = null, distance = Infinity;
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (world.friendly(actor) || !world.valid(actor)) continue;
            var body = world.observe(actor); if (!body) continue;
            var point = body.position(), current = point.minus(origin).length();
            if (current > maxDistance || current >= distance || !world.clear(origin, point)) continue;
            distance = current; best = { actor: actor, body: body };
        }
        return best;
    }
    /** The friendly body (the waggler included) most in need of the drawn move, reachable in sight. */
    function metronomeFriend(world: CombatWorld, origin: CombatPoint, selfRef: string, maxDistance: number): MetronomeTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: MetronomeTarget | null = null, need = Infinity;
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (!world.valid(actor) || !world.friendly(actor)) continue;
            var body = world.observe(actor); if (!body) continue;
            var point = body.position();
            if (point.minus(origin).length() > maxDistance) continue;
            if (String(actor.ref()) !== selfRef && !world.clear(origin, point)) continue;
            var ratio = body.health() / Math.max(1, body.maxHealth());
            if (ratio < need) { need = ratio; best = { actor: actor, body: body }; }
        }
        return best;
    }
    /** Forward point on the waggler's heading for a drawn placement/aim move; no enemy is required for it. */
    function metronomeAimPoint(action: CombatAction, reach: number): CombatPoint {
        var heading = WorldGeometry.flatUnit(action.direction(), action.targetPosition().minus(action.origin()));
        return action.origin().plus(heading.scale(reach));
    }
    /** A real spot for a drawn point/aim move: toward the visible foe, clamped to the drawn move's own reach, else the waggler's heading. */
    function metronomeIntent(action: CombatAction, target: MetronomeTarget | null, reach: number): CombatPoint {
        if (!target) return metronomeAimPoint(action, reach);
        var delta = target.body.position().minus(action.origin()), length = delta.length();
        var direction = length > 0.001 ? delta.unit() : action.direction();
        return action.origin().plus(direction.scale(Math.min(reach, Math.max(0.5, length))));
    }
    /** Map a drawn move by its kind: self on the waggler, friend on the most wounded partner, enemy on a visible foe, point/aim on a visible foe or the waggler's heading. */
    function metronomeCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var world = action.sense(), origin = action.origin(), selfRef = String(action.actor().ref());
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self") input = NativeLoadout.inputFor(action, id, action.actor());
        else if (skill.kind === "friend") {
            var friend = metronomeFriend(world, origin, selfRef, action.range());
            input = NativeLoadout.inputFor(action, id, friend ? friend.actor : action.actor());
        } else if (skill.kind === "enemy") {
            var foe = metronomeEnemy(world, origin, action.range());
            if (!foe) return null;
            input = NativeLoadout.inputFor(action, id, foe.actor, foe.body.position());
        } else {
            var target = metronomeEnemy(world, origin, action.range());
            var reach = Math.min(action.range(), metronomeRange(world, action.actor(), id));
            input = NativeLoadout.inputFor(action, id, null, metronomeIntent(action, target, reach));
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
            var hues = p("metronome", "hues", action), wag = p("metronome", "wag", action);
            action.present("metronome:wag", "world_combat:move_metronome", 1, action.origin(), JSON.stringify({ moment: "wag", hues: hues, wag: wag }));
            action.after(wag, function (current) {
                var ids = metronomePool();
                if (!ids.length) { current.reject("no-move"); return; }
                var bias = config && typeof config.bias === "string" ? String(config.bias) : "none";
                var preferred = ids;
                if (bias === "near" || bias === "far") preferred = ids.filter(function (id) {
                    // The individual's own resolved range, not the static design value: the bias bucket matches what the draw can actually reach.
                    var range = metronomeRange(current.sense(), current.actor(), id);
                    return bias === "near" ? range <= 6 : range >= 10;
                });
                var pick = function (candidate: string) { return metronomeCall(current, candidate); };
                var selection = preferred.length ? NativeLoadout.select(current, preferred, pick) : null;
                if (!selection && preferred.length !== ids.length) selection = NativeLoadout.select(current, ids, pick);
                if (!selection) { current.reject("no-move"); return; }
                var drawnType = String(CobblemonCombat.moveTemplate(selection.id).type());
                current.present("metronome:draw", "world_combat:move_metronome", 1, current.origin(), JSON.stringify({
                    moment: "draw", hues: hues, move: selection.id, type: drawnType, color: TypeColors.of(drawnType)
                }));
                NativeLoadout.call(current, selection.id, { input: selection.options.input, eligibility: "caller", cooldown: p("metronome", "recharge", current) });
            });
        }
    });
    NativeLoadout.availableWhen("metronome", function () {
        return metronomePool().length ? "" : "no-move";
    });
    // The borrowed move commits under Metronome's own action, so the drawn identity is only settled there:
    // reveal the actual localized move name once, then the borrowed move's own presentation takes over.
    WorldCombat.on("world_combat:metronome/committed", "world_combat:committed", "", function (event) {
        var action = event.action();
        if (action === null || String(action.content()) !== "world_combat:metronome") return;
        var world = event.world(), body = world.observe(event.actor());
        if (body === null) return;
        var executing = NativeLoadout.executing(action);
        if (executing === null) return;
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
            "world_combat.move.metronome.text.draw",
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 36);
    });
}
