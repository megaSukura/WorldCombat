/** One carrier owns one successful critical hit, including an already-natural critical. */
namespace PokemonSkills {
    function laserfocusAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }
    WorldCombat.effect(laserfocusMark, 2, 1200, "actor", json => {
        const value = JSON.parse(json);
        if (!MobEffects.validAnchor(value.anchor) || value.anchor.id !== laserfocusEffect
            || !(value.budget > 0) || Math.floor(value.budget) !== value.budget) throw new Error("Invalid focus budget");
        ["motes", "edge", "spark"].forEach(key => {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid focus visual");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function laserfocusMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, laserfocusMark);
        return views.length ? JSON.parse(views[0].data()) : null;
    }
    function laserfocusReleaseMark(world: CombatWorld, actor: CombatActor): void {
        world.effects(actor, laserfocusMark).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
    }
    function laserfocusWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), mark = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, mark.anchor)
            || !DamageBudgets.read(world, { actor, id: mark.budget })) { effect.end(); return; }
        const body = world.observe(actor); if (!body) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_laserfocus/aura", laserfocusScene, 1, body.position(),
            { moment: "aura", target: String(actor.ref()), motes: mark.motes, edge: mark.edge, spark: mark.spark });
        effect.schedule("watch", "watch", 4, "{}");
    }
    WorldCombat.effectHandler(laserfocusMark, "start", effect => {
        const world = effect.world(), actor = effect.target(), mark = JSON.parse(effect.state());
        if (!MobEffects.matches(world, actor, mark.anchor)) { effect.end(); return; }
        MobEffects.bind(world, actor, laserfocusEffect);
        laserfocusWatch(effect);
    });
    WorldCombat.effectHandler(laserfocusMark, "watch", laserfocusWatch);
    WorldCombat.effectHandler(laserfocusMark, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(laserfocusMark, "end", effect => {
        const mark = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        if (world.valid(actor) && world.effects(actor, DamageBudgets.definition).some(view => view.id() === mark.budget))
            world.operation(mark.budget, "world_combat:dispel", "{}");
    });
    PokemonDamage.criticalOffers.define({ id: "world_combat:move_laserfocus/offer", apply: hit => {
        const mark = laserfocusMarkOf(hit.world, hit.source);
        if (!mark || !MobEffects.matches(hit.world, hit.source, mark.anchor)) return;
        const budget = DamageBudgets.read(hit.world, { actor: hit.source, id: mark.budget });
        if (budget && budget.available > 0) hit.offers.push({ actor: String(hit.source.ref()), id: mark.budget });
    } });
    WorldCombat.on("world_combat:move_laserfocus/spend", "world_combat:damage_settled", DamageBudgets.settledHook, event => {
        const data = JSON.parse(event.data()), world = event.world(), source = event.actor();
        const receipt = DamageBudgets.results(data).filter(value => value.committed && value.active
            && value.actor === String(source.ref()) && value.payload && value.payload.kind === laserfocusId)[0];
        if (!receipt || !world.valid(source)) return;
        const mark = laserfocusMarkOf(world, source);
        if (!mark || mark.budget !== receipt.id || !MobEffects.matches(world, source, mark.anchor)) return;
        const body = world.observe(source), target = event.target(), victim = target && world.valid(target) ? world.observe(target) : null;
        const ratio = victim ? Math.max(0, Math.min(1, data.actual / Math.max(1, victim.maxHealth()))) : 0;
        world.removeMobEffect(source, laserfocusEffect, mark.anchor.key);
        laserfocusReleaseMark(world, source);
        if (!body) return;
        WorldFeedback.emit(world, laserfocusScene, 1, body.position(), { moment: "crit", target: String(source.ref()),
            spark: Math.max(10, Math.round(mark.spark * (.5 + ratio))), edge: mark.edge,
            intensity: Math.max(.6, Math.min(2.4, .7 + ratio)) }, 28);
        WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusCritText, [Math.round(data.actual * 10) / 10], 30);
        world.sound("minecraft:entity.player.attack.crit", body.position(), 16, "{}");
    });
    WorldCombat.on("world_combat:move_laserfocus/fade", "world_combat:mob_effect_removed", "", event => {
        const data = JSON.parse(event.data()); if (String(data.id) !== laserfocusEffect) return;
        const world = event.world(), actor = event.actor(); if (!world.valid(actor)) return;
        const mark = laserfocusMarkOf(world, actor);
        if (!mark || MobEffects.matches(world, actor, mark.anchor)) return;
        laserfocusReleaseMark(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor); if (!body) return;
        WorldFeedback.emit(world, laserfocusScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusFadeText, [], 22);
    });

    define({
        id: laserfocusId,
        cooldownParameter: "recharge",
        name: "磨砺",
        description: "收束精神，让自己下一次造成伤害的攻击必定击中要害；锐意留在身上直到这次出手，不出手则随时间散去。",
        uses: ["在对手硬吃一发前先磨好要害", "把一次关键命中放大成致命一击", "逼对手在锐意散去前拉开距离"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 74,
        style: "focus",
        stationary: true,
        defaults: { steady: false },
        fields: [flag("steady", "沉心蓄势")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[laserfocusId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(laserfocusId, "tempo", context))),
                recover: Math.round(p(laserfocusId, "aftercast", context)),
                cooldown: Math.round(p(laserfocusId, "recharge", context)),
                active: 1,
                range: 1
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(laserfocusId, "edge", pokemon) : 1.4, geometry: "circle", style: "focus",
                color: 0xFFC24A, label: config && config.steady ? "磨砺·沉心" : "磨砺" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_laserfocus:windup", laserfocusScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", steady: config && config.steady ? 1 : 0, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const ticks = Math.max(60, Math.round(p(laserfocusId, "focusTicks", action)));
            const motes = Math.max(10, Math.round(p(laserfocusId, "motes", action)));
            const edge = Math.max(1, p(laserfocusId, "edge", action));
            const spark = Math.max(12, Math.round(p(laserfocusId, "spark", action)));
            // 载体应用失败就不播 focus 成功，也不留下无主的锐意实例。
            const carrier = MobEffects.set(world, actor, laserfocusEffect, ticks, 0);
            if (carrier === null) { done(action); return; }
            laserfocusReleaseMark(world, actor);
            const anchor = MobEffects.anchor(carrier);
            const budget = DamageBudgets.open(world, actor, ticks, { uses: 1, anchor: anchor, payload: { kind: laserfocusId } });
            if (!budget) { world.removeMobEffect(actor, laserfocusEffect, carrier.key()); done(action); return; }
            const marker = world.effect(laserfocusMark, actor, JSON.stringify({ budget: budget.id, anchor: anchor,
                motes: motes, edge: edge, spark: spark }), ticks);
            if (!(marker > 0)) {
                world.operation(budget.id, "world_combat:dispel", "{}");
                world.removeMobEffect(actor, laserfocusEffect, carrier.key()); done(action); return;
            }
            sound(action, "minecraft:block.beacon.activate");
            if (body !== null) {
                WorldFeedback.emit(world, laserfocusScene, 1, body.position(),
                    { moment: "focus", target: String(actor.ref()), motes: motes, edge: edge, spark: spark,
                        steady: config && config.steady ? 1 : 0, scale: Math.max(0.6, Math.min(2.2, edge / 1.4)) }, 34);
                WorldFeedback.text(world, laserfocusAbove(body.position()), laserfocusReadyText, [Math.round(ticks / 20)], 32);
            }
            done(action);
        }
    });
}
