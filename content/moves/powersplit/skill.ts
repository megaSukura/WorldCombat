namespace PokemonSkills {
    const powersplitScene = "world_combat:move_powersplit";
    const powersplitWindow = "world_combat:powersplit_window";
    const powersplitLink = "world_combat:move_powersplit/link";
    const powersplitMark = "world_combat:powersplit_mark";
    interface PowerSplitState {
        actors: string[]; carriers: MobEffects.Anchor[]; donate: number[]; credit: number[];
        given: boolean[]; received: boolean[]; end: number;
    }
    WorldCombat.effect(powersplitMark, 1, 160, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powersplitMark, "start", () => {});
    WorldCombat.effectHandler(powersplitMark, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effect(powersplitLink, 1, 160, "actor", json => json, EffectProtocols.unchanged);
    function powersplitActors(world: CombatWorld, value: PowerSplitState): CombatActor[] | null {
        const actors = value.actors.map(ref => world.actor(ref));
        if (actors.some(actor => actor === null || !world.valid(actor))) return null;
        const result = actors as CombatActor[];
        return result.every((actor, i) => MobEffects.matches(world, actor, value.carriers[i])) ? result : null;
    }
    function powersplitWatch(effect: CombatEffect): void {
        const world = effect.world(), value: PowerSplitState = JSON.parse(effect.state()), actors = powersplitActors(world, value);
        if (!actors || world.tick() >= value.end || value.given.every(Boolean) && value.received.every(Boolean)) { effect.end(); return; }
        const body = world.observe(actors[0]);
        if (!body) { effect.end(); return; }
        const credit = value.credit.map((id, i) => {
            const view = id ? DamageBudgets.read(world, { actor: actors[i], id }) : null;
            return view && view.remaining > 0 ? Number(view.payload.amount) : 0;
        });
        WorldFeedback.onEffect(world, effect.id(), "powersplit:link", powersplitScene, 1, body.position(),
            { moment: "link", actors: value.actors, given: value.given, received: value.received, credit });
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effectHandler(powersplitLink, "start", effect => {
        const world = effect.world(), value: PowerSplitState = JSON.parse(effect.state()), actors = powersplitActors(world, value);
        if (!actors) { effect.end(); return; }
        for (let side = 0; side < 2; side++) {
            const budget = DamageBudgets.open(world, actors[side], 160, { anchor: value.carriers[side],
                payload: { move: "powersplit", role: "give", pair: effect.id(), side } });
            if (!budget) { effect.end(); return; }
            value.donate[side] = budget.id;
        }
        effect.state(JSON.stringify(value));
        actors.forEach((actor, side) => world.effect(powersplitMark, actor,
            JSON.stringify({ pair: effect.id(), owner: value.actors[0], partner: value.actors[1 - side], side, carrier: value.carriers[side] }), 160));
        powersplitWatch(effect);
    });
    WorldCombat.effectHandler(powersplitLink, "watch", powersplitWatch);
    WorldCombat.effectHandler(powersplitLink, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(powersplitLink, "end", effect => {
        const world = effect.world(), value: PowerSplitState = JSON.parse(effect.state());
        value.actors.forEach((ref, side) => {
            const actor = world.actor(ref);
            if (!actor || !world.valid(actor) || world.observe(actor) === null) return;
            const carrier = value.carriers[side];
            world.removeMobEffect(actor, carrier.id, carrier.key);
            [value.donate[side], value.credit[side]].forEach(id => { if (id) world.operation(id, "world_combat:dispel", "{}"); });
            world.effects(actor, powersplitMark).forEach(mark => {
                if (JSON.parse(mark.data()).pair === effect.id()) world.operation(mark.id(), "world_combat:dispel", "{}");
            });
        });
    });
    function powersplitRead(world: CombatWorld, actor: CombatActor): { view: CombatEffectView; value: PowerSplitState; actors: CombatActor[]; side: number } | null {
        if (!world.valid(actor)) return null;
        const marks = world.effects(actor, powersplitMark);
        for (const mark of marks) {
            const data = JSON.parse(mark.data()), owner = world.actor(data.owner);
            if (!owner || !world.valid(owner)) continue;
            const view = world.effects(owner, powersplitLink).filter(item => item.id() === data.pair)[0];
            if (!view) continue;
            const value: PowerSplitState = JSON.parse(view.data()), actors = powersplitActors(world, value), side = Number(data.side);
            if (actors && value.end > world.tick() && value.actors[side] === String(actor.ref())) return { view, value, actors, side };
        }
        return null;
    }
    DamageBudgets.allocations.define({ id: "world_combat:powersplit/share", apply: context => {
        const world = context.world, data = context.data;
        if (!(data.amount > 0) || !DamageSemantics.directOffense(data) || String(context.source.ref()) === String(context.target.ref())) return;
        const link = powersplitRead(world, context.source);
        if (!link) return;
        const side = link.side, value = link.value, claims: DamageBudgets.Claim[] = [];
        const donation = !value.given[side] ? DamageBudgets.read(world, { actor: context.source, id: value.donate[side] }) : null;
        const credit = value.credit[side] && !value.received[side]
            ? DamageBudgets.read(world, { actor: context.source, id: value.credit[side] }) : null;
        if (donation && donation.available > 0) claims.push(donation);
        if (credit && credit.available > 0) claims.push(credit);
        if (!claims.length) return;
        const reserved = DamageBudgets.reserve(context, claims);
        if (!reserved) return;
        const gives = !!donation && reserved.some(claim => claim.id === donation.id);
        const takes = !!credit && reserved.some(claim => claim.id === credit.id);
        const own = Number(data.amount), gift = gives ? own * .5 : 0, borrowed = takes ? Number(credit!.payload.amount) : 0;
        // Only this attack's owned amount is donated. A borrowed portion is added afterwards exactly once.
        data.amount = own - gift + borrowed;
        data.powerSplit = { pair: link.view.id(), owner: value.actors[0], side, donated: gift, borrowed,
            give: gives ? value.donate[side] : 0, take: takes ? value.credit[side] : 0 };
    } });
    WorldCombat.effectHandler(powersplitLink, "operation:world_combat:receipt", effect => {
        const input = JSON.parse(effect.input()), world = effect.world(), value: PowerSplitState = JSON.parse(effect.state());
        const actors = powersplitActors(world, value), side = Number(input.side), other = 1 - side;
        if (!actors || side !== 0 && side !== 1 || String(effect.caller().ref()) !== value.actors[side] || world.tick() >= value.end) return;
        if (input.take === value.credit[side] && input.take > 0 && !value.received[side]) value.received[side] = true;
        let gift = false;
        if (input.give === value.donate[side] && input.give > 0 && !value.given[side]
            && typeof input.donated === "number" && isFinite(input.donated) && input.donated > 0) {
            value.given[side] = true;
            const budget = DamageBudgets.open(world, actors[other], Math.max(1, value.end - world.tick()), {
                anchor: value.carriers[other], payload: { move: "powersplit", role: "take", pair: effect.id(), side: other, amount: input.donated } });
            if (!budget) { effect.end(); return; }
            value.credit[other] = budget.id;
            gift = true;
        }
        effect.state(JSON.stringify(value));
        if (gift) {
            const body = world.observe(actors[side]);
            if (body) WorldFeedback.emit(world, powersplitScene, 1, body.position(), {
                moment: "gift", actors: [value.actors[side], value.actors[other]], amount: input.donated, start: world.tick(), duration: 10 }, 10);
        }
        powersplitWatch(effect);
    });
    WorldCombat.on("world_combat:powersplit/settle", "world_combat:damage_settled", DamageBudgets.settledHook, event => {
        const world = event.world(), actor = event.actor(), data = JSON.parse(event.data()), share = data.powerSplit;
        if (!share || !(data.actual > 0) || !world.valid(actor)) return;
        const link = powersplitRead(world, actor);
        if (!link || link.view.id() !== share.pair || link.side !== share.side) return;
        const paid = DamageBudgets.results(data).filter(result => result.committed && result.active && result.payload
            && result.payload.move === "powersplit" && result.payload.pair === share.pair && result.actor === String(actor.ref()));
        const give = paid.some(result => result.id === share.give && result.payload.role === "give") ? share.give : 0;
        const take = paid.some(result => result.id === share.take && result.payload.role === "take") ? share.take : 0;
        if (give || take) world.operation(link.view.id(), "world_combat:receipt", JSON.stringify({
            side: link.side, give, take, donated: give ? share.donated : 0 }));
    });
    // The surviving endpoint cleans its own visible carrier even when the original owner has died.
    WorldCombat.on("world_combat:powersplit/window", "world_combat:mob_effect_tick", "", event => {
        const data = JSON.parse(event.data()), world = event.world(), actor = event.actor();
        if (String(data.id) !== powersplitWindow || !world.valid(actor) || powersplitRead(world, actor)) return;
        const carrier = MobEffects.read(world, actor, powersplitWindow);
        if (carrier) world.removeMobEffect(actor, powersplitWindow, carrier.key());
    });
    define({
        id: "powersplit", cooldownParameter: "recharge", name: "力量平分",
        description: "与一名敌人或伙伴短暂连接。双方各自下一次成功直接命中让出一半伤害预算，存给对方下一次命中取用；借来的份额不会再赠出。每人一收一送，八秒内结束。",
        uses: ["削弱强敌下一击并借用其中一半", "与伙伴轮流出手交换一份攻击", "在短连接内完成两次接战"],
        kind: "aim", range: 6, maxRange: 12, prepare: 10, active: 1, recover: 6, cooldown: 95,
        style: "split", stationary: true, defaults: { ai: { maxChase: 12, edge: 1.15, leaveStation: false, share: false } },
        fields: [],
        indicator: () => ({ radius: 6, geometry: "line", style: "split", color: 0xFFB060, label: "力量平分" }),
        resolve: (pokemon, config, world, actor, attributes) => {
            const c: NumberContext = { pokemon, skill: skills["powersplit"], detail: { values: config }, world, actor, attributes };
            return { prepare: p("powersplit", "tempo", c), recover: p("powersplit", "aftercast", c), cooldown: p("powersplit", "recharge", c),
                active: 1, range: p("powersplit", "reach", c) };
        },
        ready: action => {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (!target || !world.valid(target) || String(target.ref()) === String(actor.ref())) return "invalid-target";
            if (MobEffects.read(world, actor, powersplitWindow) || MobEffects.read(world, target, powersplitWindow)) return "already-linked";
            const body = world.observe(target);
            return body && body.position().minus(action.origin()).length() <= action.range() && world.clear(action.origin(), body.position()) ? "" : "out-of-range";
        },
        windup: (action, _config, prepare) => {
            action.present("powersplit:prepare", powersplitScene, 1, action.origin(), JSON.stringify({
                moment: "prepare", actors: [String(action.actor().ref()), action.target() ? String(action.target()!.ref()) : ""],
                start: action.sense().tick(), duration: prepare }));
            return prepare;
        },
        execute: (action, _move, _config, done) => {
            const world = action.world(), actor = action.actor(), target = action.target(), body = target ? world.observe(target) : null;
            if (!target || !body || String(target.ref()) === String(actor.ref())
                || body.position().minus(action.origin()).length() > action.range() || !world.clear(action.origin(), body.position())
                || MobEffects.read(world, actor, powersplitWindow) || MobEffects.read(world, target, powersplitWindow)) { done(action); return; }
            const selfCarrier = MobEffects.apply(world, actor, powersplitWindow, 160, 0);
            const otherCarrier = selfCarrier ? MobEffects.apply(world, target, powersplitWindow, 160, 0) : null;
            if (!selfCarrier || !otherCarrier) {
                if (selfCarrier) world.removeMobEffect(actor, powersplitWindow, selfCarrier.key());
                done(action); return;
            }
            world.effect(powersplitLink, actor, JSON.stringify({
                actors: [String(actor.ref()), String(target.ref())], carriers: [MobEffects.anchor(selfCarrier), MobEffects.anchor(otherCarrier)],
                donate: [0, 0], credit: [0, 0], given: [false, false], received: [false, false], end: world.tick() + 160 }), 160);
            sound(action, "minecraft:block.enchantment_table.use");
            done(action);
        }
    });
}
