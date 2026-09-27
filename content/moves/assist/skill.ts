/**
 * Assist server behaviour.
 *
 * The pool is the implemented moves known by friendly Pokemon inside the effective call radius that
 * answer through a clear path, filtered by the native `flags.noassist` marker. The move calls for
 * `call` ticks, then borrows one such move and hands it to NativeLoadout.call under Assist's own
 * PP/cooldown. Being alone (or out of ear) rejects without paying. The borrowed move is mapped by
 * its own kind: enemy moves take the nearest visible foe, friend moves the most wounded partner,
 * point/aim moves a real spot on the caller's heading; the borrowed move's own reach still applies.
 */
namespace PokemonSkills {
    /** One borrowable move together with the ally that provides it this cast. */
    interface AssistCandidate { id: string; provider: string; }
    /** A live body chosen as the borrowed move's recipient or aim point. */
    interface AssistTarget { actor: CombatActor; body: CombatObservation; }
    /** The borrowed move's own resolved range for this individual (configuration and level), or its design range. */
    function assistRange(world: CombatWorld, actor: CombatActor, id: string): number {
        var skill = skills[id]; if (!skill) return 0;
        if (!skill.resolve) return skill.range;
        var runtime = skill.resolve(CobblemonCombat.pokemon(actor), config(world, actor, id), world, actor);
        return runtime.range === undefined ? skill.range : runtime.range;
    }
    /** Nearest non-friendly body actually in sight within reach; one wall does not discard the whole candidate. */
    function assistEnemy(world: CombatWorld, origin: CombatPoint, selfRef: string, maxDistance: number): AssistTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: AssistTarget | null = null, distance = Infinity;
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (String(actor.ref()) === selfRef || world.friendly(actor) || !world.valid(actor)) continue;
            var body = world.observe(actor); if (!body) continue;
            var point = body.position(), current = point.minus(origin).length();
            if (current > maxDistance || current >= distance || !world.clear(origin, point)) continue;
            distance = current; best = { actor: actor, body: body };
        }
        return best;
    }
    /** The friendly body (the caller included) most in need of a helping move, reachable in sight. */
    function assistFriend(world: CombatWorld, origin: CombatPoint, selfRef: string, maxDistance: number): AssistTarget | null {
        var found = world.query(origin, Math.min(32, Math.max(1, maxDistance)), false);
        var best: AssistTarget | null = null, need = Infinity;
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
    /** Borrowable moves inside the effective call radius, only from allies the caller can actually answer in sight. */
    export function assistCandidates(world: CombatWorld, origin: CombatPoint, selfRef: string, radius: number): AssistCandidate[] {
        var found = world.query(origin, Math.min(32, Math.max(1, radius)), false);
        var list: AssistCandidate[] = [], seen: { [id: string]: boolean } = {};
        for (var i = 0; i < found.length; i++) {
            var actor = found[i];
            if (String(actor.ref()) === selfRef || !world.friendly(actor) || !world.valid(actor) || String(actor.domain()) !== "cobblemon") continue;
            var body = world.observe(actor);
            if (!body || !world.clear(origin, body.position())) continue;
            var pokemon = CobblemonCombat.pokemon(actor);
            for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
                var known = pokemon.move(slot);
                if (!known) continue;
                var id = String(known.id());
                if (!skills[id] || seen[id] || NativeLoadout.facts(known).flags.noassist) continue;
                seen[id] = true;
                list.push({ id: id, provider: String(actor.ref()) });
            }
        }
        return list;
    }
    /** True when an answering ally exists and at least one borrowable move currently has a legal recipient. */
    export function assistAvailable(world: CombatWorld, origin: CombatPoint, selfRef: string, radius: number): boolean {
        var candidates = assistCandidates(world, origin, selfRef, radius);
        if (!candidates.length) return false;
        var actor = world.actor(selfRef);
        if (!actor) return true;
        var span = assistRange(world, actor, "assist");
        for (var i = 0; i < candidates.length; i++) {
            var skill = skills[candidates[i].id];
            var kind = skill ? skill.kind : "self";
            if (kind === "self" || kind === "friend" || kind === "point" || kind === "motion" || kind === "aim") return true;
            if (assistEnemy(world, origin, selfRef, Math.min(span, assistRange(world, actor, candidates[i].id)))) return true;
        }
        return false;
    }
    /** Forward point on the caller's heading; the borrowed placement/aim move's own reach and checks still apply. */
    function assistAimPoint(action: CombatAction, reach: number): CombatPoint {
        var heading = WorldGeometry.flatUnit(action.direction(), action.targetPosition().minus(action.origin()));
        return action.origin().plus(heading.scale(reach));
    }
    function assistCall(action: CombatAction, id: string): NativeLoadout.CallOptions | null {
        var skill = skills[id]; if (!skill) return null;
        var world = action.sense(), origin = action.origin(), selfRef = String(action.actor().ref());
        var reach = Math.min(action.range(), assistRange(world, action.actor(), id));
        var input: NativeLoadout.CallOptions["input"] | null;
        if (skill.kind === "self") input = NativeLoadout.inputFor(action, id, action.actor());
        else if (skill.kind === "friend") {
            var friend = assistFriend(world, origin, selfRef, reach);
            input = NativeLoadout.inputFor(action, id, friend ? friend.actor : action.actor());
        } else if (skill.kind === "enemy") {
            var foe = assistEnemy(world, origin, selfRef, reach);
            if (!foe) return null;
            input = NativeLoadout.inputFor(action, id, foe.actor, foe.body.position());
        } else {
            var target = assistEnemy(world, origin, selfRef, reach);
            input = target ? NativeLoadout.inputFor(action, id, target.actor, target.body.position())
                : NativeLoadout.inputFor(action, id, null, assistAimPoint(action, reach));
        }
        return input ? { eligibility: "caller", input: input } : null;
    }

    define({
        id: "assist",
        cooldownParameter: "recharge",
        name: "借助",
        description: "向附近伙伴求助，借它们已学会的一个招式由自己使出；借来的招式范围有限，也必须够得着目标，没有可借的招式时不会发动。",
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
            var bonds = p("assist", "bonds", action), call = p("assist", "call", action);
            var radius = p("assist", "radius", action);
            // Show the real call radius and a sparse line to each partner that currently answers in sight.
            var world = action.sense(), selfRef = String(action.actor().ref());
            var shown = assistCandidates(world, action.origin(), selfRef, radius), partners: string[] = [];
            for (var i = 0; i < shown.length && partners.length < 4; i++) if (partners.indexOf(shown[i].provider) < 0) partners.push(shown[i].provider);
            action.present("assist:call", "world_combat:move_assist", 1, action.origin(), JSON.stringify({
                moment: "call", bonds: bonds, radius: radius, call: call
            }));
            action.present("assist:thread", "world_combat:move_assist_thread", 1, action.origin(), JSON.stringify({
                phase: "call", radius: radius, candidates: partners, provider: ""
            }));
            action.after(call, function (current) {
                // Re-confirm every partner still answers through a clear path on the frame the borrow settles.
                var now = current.sense(), nowRef = String(current.actor().ref());
                var candidates = assistCandidates(now, current.origin(), nowRef, p("assist", "radius", current));
                if (!candidates.length) { current.reject("no-ally"); return; }
                var pool: string[] = [], providerOf: { [id: string]: string } = {};
                for (var index = 0; index < candidates.length; index++) { pool.push(candidates[index].id); providerOf[candidates[index].id] = candidates[index].provider; }
                var selection = NativeLoadout.select(current, pool, function (candidate) { return assistCall(current, candidate); });
                if (!selection) { current.reject("no-ally"); return; }
                var provider = providerOf[selection.id] || "";
                current.present("assist:borrow", "world_combat:move_assist", 1, current.origin(), JSON.stringify({
                    moment: "borrow", bonds: bonds, pool: pool.length, provider: provider, path: [provider, nowRef]
                }));
                // The candidate lines give way to one bright thread from the chosen ally, then the borrowed move runs.
                current.present("assist:thread", "world_combat:move_assist_thread", 1, current.origin(), JSON.stringify({
                    phase: "handover", radius: 0, candidates: [], provider: provider, path: [provider, nowRef], start: now.tick(), duration: 18
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
