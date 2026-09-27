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
    /** A live body chosen as the borrowed move's recipient or aim point. */
    interface SleeptalkTarget { actor: CombatActor; body: CombatObservation; }
    /** The borrowed move's own resolved range for this individual (configuration and level), or its design range. */
    function sleeptalkRange(world: CombatWorld, actor: CombatActor, id: string): number {
        var skill = skills[id]; if (!skill) return 0;
        if (!skill.resolve) return skill.range;
        var runtime = skill.resolve(CobblemonCombat.pokemon(actor), config(world, actor, id), world, actor);
        return runtime.range === undefined ? skill.range : runtime.range;
    }
    /** Nearest non-friendly body actually in sight within reach; one wall does not discard the whole candidate. */
    function sleeptalkEnemy(world: CombatWorld, origin: CombatPoint, maxDistance: number): SleeptalkTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: SleeptalkTarget | null = null, distance = Infinity;
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
    /** The friendly body (the sleeper included) most in need of the borrowed move, reachable in sight. */
    function sleeptalkFriend(world: CombatWorld, origin: CombatPoint, selfRef: string, maxDistance: number): SleeptalkTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: SleeptalkTarget | null = null, need = Infinity;
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
    /** Forward point on the sleeper's heading for a borrowed placement/aim move. */
    function sleeptalkAimPoint(action: CombatAction, reach: number): CombatPoint {
        var heading = WorldGeometry.flatUnit(action.direction(), action.targetPosition().minus(action.origin()));
        return action.origin().plus(heading.scale(reach));
    }
    /** Map a candidate move by its kind: self on the sleeper, friend on the most wounded partner, enemy on a visible foe, point/aim on the nearest visible foe or the sleeper's heading. */
    function sleeptalkCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var world = action.sense(), origin = action.origin(), selfRef = String(action.actor().ref());
        var reach = Math.min(action.range(), sleeptalkRange(world, action.actor(), id));
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self") input = NativeLoadout.inputFor(action, id, action.actor());
        else if (skill.kind === "friend") {
            var friend = sleeptalkFriend(world, origin, selfRef, reach);
            input = NativeLoadout.inputFor(action, id, friend ? friend.actor : action.actor());
        } else if (skill.kind === "enemy") {
            var foe = sleeptalkEnemy(world, origin, reach);
            if (!foe) return null;
            input = NativeLoadout.inputFor(action, id, foe.actor, foe.body.position());
        } else {
            var target = sleeptalkEnemy(world, origin, reach);
            input = target ? NativeLoadout.inputFor(action, id, target.actor, target.body.position())
                : NativeLoadout.inputFor(action, id, null, sleeptalkAimPoint(action, reach));
        }
        return input ? { eligibility: "caller", input: input } : null;
    }
    /** True when the sleeper's own set holds a callable move that currently has a legal recipient. */
    export function sleeptalkReady(world: CombatWorld, selfRef: string): boolean {
        var actor = world.actor(selfRef); if (!actor) return false;
        var body = world.observe(actor); if (!body) return false;
        var origin = body.position();
        var pokemon = CobblemonCombat.pokemon(actor);
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
            var known = pokemon.move(slot);
            if (!known) continue;
            var id = String(known.id());
            if (!skills[id]) continue;
            var info = NativeLoadout.facts(known);
            if (info.flags.nosleeptalk || info.flags.charge) continue;
            var kind = skills[id].kind;
            if (kind === "self" || kind === "friend" || kind === "point" || kind === "motion" || kind === "aim") return true;
            if (sleeptalkEnemy(world, origin, Math.min(16, sleeptalkRange(world, actor, id)))) return true;
        }
        return false;
    }

    define({
        id: "sleeptalk",
        cooldownParameter: "recharge",
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
            var echoes = p("sleeptalk", "echoes", action), murmur = p("sleeptalk", "murmur", action);
            action.present("sleeptalk:murmur", "world_combat:move_sleeptalk", 1, action.origin(), JSON.stringify({ moment: "murmur", echoes: echoes, murmur: murmur }));
            action.after(murmur, function (current) {
                // The dream only holds while the shared sleep identity is present: waking ends it before anything is drawn.
                if (!CombatStatus.behaves(current.sense(), current.actor(), "sleep")) { current.reject("not-asleep"); return; }
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
