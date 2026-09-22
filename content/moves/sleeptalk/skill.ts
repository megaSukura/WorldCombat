/**
 * Sleep Talk server behaviour.
 *
 * Own rhythm (`run`): the move mumbles for `murmur` ticks, then draws one implemented move from the
 * user's own moveset — filtering flags.nosleeptalk / flags.charge, as the native data does — and
 * hands the same committed transaction to it through NativeLoadout.call. The caller keeps the PP and
 * cooldown identity; `eligibility: "caller"` keeps Sleep Talk's own sleep exemption applying at the
 * borrowed move's commit, so the dream can finish while the body is asleep. A draw with no valid
 * target/move rejects without paying.
 */
namespace PokemonSkills {
    function sleeptalkEnemy(action: CombatAction, origin: CombatPoint, radius: number): { actor: CombatActor; body: CombatObservation } | null {
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
    /** Map a candidate move onto the caller's field: self casts on the caller, friendly moves on the caller, everything else at the nearest enemy. */
    function sleeptalkCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self" || skill.kind === "friend") input = NativeLoadout.inputFor(action, id, action.actor());
        else {
            var found = sleeptalkEnemy(action, action.origin(), action.range() + 2);
            if (!found) return null;
            input = NativeLoadout.inputFor(action, id, found.actor, found.body.position());
        }
        return input ? { eligibility: "caller", input: input } : null;
    }

    define({
        id: "sleeptalk",
        name: "梦话",
        description: "只能在睡觉时使用；从自己已学会的招式中随机使出一个。",
        uses: ["睡眠中呓语", "随机借出一个已知招式"],
        kind: "self",
        range: 16,
        maxRange: 20,
        prepare: 6,
        active: 1,
        recover: 0,
        cooldown: 90,
        style: "dream",
        defaults: {},
        fields: [],
        eligibility: function (context) {
            if (CombatStatus.behaves(context.world, context.actor, "sleep")) delete context.blocked.asleep;
            else context.blocked["not-asleep"] = true;
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["sleeptalk"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p("sleeptalk", "murmur", context),
                recover: 0,
                cooldown: p("sleeptalk", "recharge", context),
                active: 1,
                range: p("sleeptalk", "span", context)
            };
        },
        run: function (action, move, config) {
            var echoes = p("sleeptalk", "echoes", action);
            action.present("sleeptalk:murmur", "world_combat:move_sleeptalk", 1, action.origin(), JSON.stringify({ moment: "murmur", echoes: echoes }));
            action.after(p("sleeptalk", "murmur", action), function (current) {
                var pokemon = CobblemonCombat.pokemon(current.actor()), ids: string[] = [];
                for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                    var known = pokemon.move(slot);
                    if (!known) continue;
                    var id = String(known.id());
                    if (!skills[id] || ids.indexOf(id) >= 0) continue;
                    var info = NativeLoadout.facts(known);
                    if (info.flags.nosleeptalk || info.flags.charge) continue;
                    ids.push(id);
                }
                var selection = ids.length ? NativeLoadout.select(current, ids, function (candidate) { return sleeptalkCall(current, candidate); }) : null;
                if (!selection) { current.reject("no-dream"); return; }
                current.present("sleeptalk:draw", "world_combat:move_sleeptalk", 1, current.origin(), JSON.stringify({ moment: "draw", echoes: echoes }));
                NativeLoadout.call(current, selection.id, { input: selection.options.input, eligibility: "caller", cooldown: p("sleeptalk", "recharge", current) });
            });
        }
    });
    NativeLoadout.availableWhen("sleeptalk", function (world) {
        return CombatStatus.behaves(world, world.source(), "sleep") ? "" : "not-asleep";
    });
    // The borrowed move commits under Sleep Talk's own action, so its identity is only settled at commit:
    // announce what the dream produced there (name in the world, chime for the moment).
    WorldCombat.on("world_combat:sleeptalk/committed", "world_combat:committed", "", function (event) {
        var action = event.action();
        if (action === null || String(action.content()) !== "world_combat:sleeptalk") return;
        var world = event.world(), body = world.observe(event.actor());
        if (body === null) return;
        world.sound("cobblemon:particle.shiny_ambient_chime", body.position(), 16, "{}");
        var executing = NativeLoadout.executing(action);
        if (executing !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
            "world_combat.move.sleeptalk.text.dream",
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 40);
    });
}
