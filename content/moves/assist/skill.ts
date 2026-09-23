/**
 * Assist server behaviour.
 *
 * The pool is the implemented moves known by friendly Pokemon inside the effective call radius,
 * filtered by the native `flags.noassist` marker. The move calls for `call` ticks, then borrows one
 * such move and hands it to NativeLoadout.call under Assist's own PP/cooldown. Being alone (or out
 * of ear) rejects without paying; the caller always performs the borrowed move on itself, as the
 * native data does.
 */
namespace PokemonSkills {
    /** True when any friendly Pokemon within the radius knows an implemented move Assist may borrow. */
    export function assistAvailable(world: CombatWorld, origin: CombatPoint, selfRef: string, radius: number): boolean {
        var found = world.query(origin, Math.min(32, Math.max(1, radius)), false);
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (String(actor.ref()) === selfRef || !world.friendly(actor) || !world.valid(actor) || String(actor.domain()) !== "cobblemon") continue;
            var pokemon = CobblemonCombat.pokemon(actor);
            for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                var known = pokemon.move(slot);
                if (!known) continue;
                var id = String(known.id());
                if (!skills[id] || NativeLoadout.facts(known).flags.noassist) continue;
                return true;
            }
        }
        return false;
    }
    function assistPool(action: CombatAction, radius: number): string[] {
        var world = action.sense(), origin = action.origin(), selfRef = String(action.actor().ref());
        var found = world.query(origin, Math.min(32, Math.max(1, radius)), false), ids: string[] = [];
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (String(actor.ref()) === selfRef || !world.friendly(actor) || !world.valid(actor) || String(actor.domain()) !== "cobblemon") continue;
            var pokemon = CobblemonCombat.pokemon(actor);
            for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                var known = pokemon.move(slot);
                if (!known) continue;
                var id = String(known.id());
                if (!skills[id] || ids.indexOf(id) >= 0 || NativeLoadout.facts(known).flags.noassist) continue;
                ids.push(id);
            }
        }
        return ids;
    }
    function assistEnemy(action: CombatAction, origin: CombatPoint, radius: number): { actor: CombatActor; body: CombatObservation } | null {
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
    function assistCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self" || skill.kind === "friend") input = NativeLoadout.inputFor(action, id, action.actor());
        else {
            var found = assistEnemy(action, action.origin(), action.range() + 2);
            if (!found) return null;
            input = NativeLoadout.inputFor(action, id, found.actor, found.body.position());
        }
        return input ? { eligibility: "caller", input: input } : null;
    }

    define({
        id: "assist",
        cooldownParameter: "recharge",
        name: "借助",
        description: "向附近伙伴求助，从它们已学会的招式中随机借一个使出。",
        uses: ["呼唤附近伙伴", "随机借出一个伙伴招式"],
        kind: "self",
        range: 14,
        maxRange: 18,
        prepare: 4,
        active: 1,
        recover: 0,
        cooldown: 95,
        style: "team",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["assist"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p("assist", "call", context),
                recover: 0,
                cooldown: p("assist", "recharge", context),
                active: 1,
                range: p("assist", "span", context)
            };
        },
        run: function (action, move, settings) {
            var bonds = p("assist", "bonds", action);
            action.present("assist:call", "world_combat:move_assist", 1, action.origin(), JSON.stringify({
                moment: "call", bonds: bonds, radius: p("assist", "radius", action)
            }));
            action.after(p("assist", "call", action), function (current) {
                var pool = assistPool(current, p("assist", "radius", current));
                if (!pool.length) { current.reject("no-ally"); return; }
                var selection = NativeLoadout.select(current, pool, function (candidate) { return assistCall(current, candidate); });
                if (!selection) { current.reject("no-ally"); return; }
                current.present("assist:borrow", "world_combat:move_assist", 1, current.origin(), JSON.stringify({
                    moment: "borrow", bonds: bonds, pool: pool.length
                }));
                NativeLoadout.call(current, selection.id, { input: selection.options.input, eligibility: "caller", cooldown: p("assist", "recharge", current) });
            });
        }
    });
    NativeLoadout.availableWhen("assist", function (world, pokemon) {
        var body = world.observe(world.source());
        if (body === null) return "no-ally";
        var settings = config(world, world.source(), "assist");
        var radius = Math.max(4, Math.min(24, Number(settings.callRadius) + pokemon.level() / 20));
        return assistAvailable(world, body.position(), String(world.source().ref()), radius) ? "" : "no-ally";
    });
    // The borrowed move commits under Assist's own action; name the ally move the shout produced.
    WorldCombat.on("world_combat:assist/committed", "world_combat:committed", "", function (event) {
        var action = event.action();
        if (action === null || String(action.content()) !== "world_combat:assist") return;
        var world = event.world(), body = world.observe(event.actor());
        if (body === null) return;
        world.sound("minecraft:block.bell.resonate", body.position(), 16, "{}");
        var executing = NativeLoadout.executing(action);
        if (executing !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
            "world_combat.move.assist.text.borrow",
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 40);
    });
}
