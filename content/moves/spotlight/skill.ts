/**
 * 聚光灯 / Spotlight —— 执行组织。
 *
 * 核心念头：一束光从你手里打出去钉在对手身上。它被照得无处可躲——落在它身上的伤害更重，
 *   而且它成为全场焦点：施法者一侧的原版生物会被指向它，所有人都先冲它去。
 *
 * 出手：短起手（windup 在掌心聚起一束光），提交后把光束沿两人画出来（beam，用 data.path）。
 * 命中：给目标挂共享身份 world_combat:status/spotlight（本单元效果 world_combat:spotlighted），
 *   并把暴露加成、扫过范围、光点数写进 world_combat:spotlight_mark。
 * 持续：带身份者每隔一段被照亮的伤害更重（入场规则 ×(1+expose)），mark 每 20 刻把施法者一侧的
 *   原版生物指向它（world.target），让「只瞄准它」真正落在行为上；身上持续亮光。
 * 结束：照明走完或被清掉时收回 mark，光安静散去。两种方式都不消耗目标身上的效果，只按时间走。
 * 反制：照明有时限，避开这段时间就能少挨；目标也可以拉开距离，让施法者一侧的生物够不到。
 */
namespace PokemonSkills {
    function spotlightAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    function spotlightMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, spotlightMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    WorldCombat.effect(spotlightMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["bonus", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid spotlight mark: " + key);
        });
        if (typeof value.caster !== "string") throw new Error("Invalid spotlight mark: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(spotlightMark, "start", function (effect) { effect.schedule("sweep", "sweep", 20, "{}"); });
    WorldCombat.effectHandler(spotlightMark, "sweep", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        const found = world.query(body.position(), Math.max(1, Number(data.radius) || 4), false);
        for (let i = 0; i < found.length; i++) {
            const other = found[i];
            if (String(other.ref()) === String(target.ref())) continue;
            if (!world.friendly(other)) continue;
            const observed = world.observe(other);
            if (observed === null || observed.player()) continue;
            world.target(other, target);
        }
        effect.schedule("sweep", "sweep", 20, "{}");
    });
    WorldCombat.effectHandler(spotlightMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(spotlightMark, "end", function (effect) {
        const world = effect.world(), target = effect.target();
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, spotlightScene, 1, body.position(), { moment: "fade", target: String(target.ref()) }, 24);
        WorldFeedback.text(world, spotlightAbove(body.position()), spotlightFadeText, [], 22);
    });

    // 曝光：被照亮的活体受到的伤害 ×(1+expose)，不消耗照明。
    NativeEffects.incomingRules.define({ id: "world_combat:move_spotlight/expose", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0)) return;
        const world = hit.world, target = hit.target, source = hit.source;
        if (!world.valid(target) || String(source.ref()) === String(target.ref())) return;
        if (!CombatStatus.has(world, target, spotlightStatus)) return;
        const mark = spotlightMarkOf(world, target);
        const bonus = mark ? Math.max(0.05, Number(mark.bonus) || 0.15) : 0.15;
        data.amount *= 1 + bonus;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, spotlightScene, 1, body.position(),
            { moment: "flare", target: String(target.ref()), bonus: bonus, burst: Math.round(14 + bonus * 60) }, 20);
        WorldFeedback.text(world, spotlightAbove(body.position()), spotlightFlareText, [Math.round(bonus * 100)], 18);
    } });

    // 持续亮光：带身份者每隔一会儿亮一次，光点数与范围从本招算出的值来。
    WorldCombat.on("world_combat:move_spotlight/lit", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== spotlightEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, spotlightEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = spotlightMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_spotlight/lit/" + String(actor.ref()), spotlightScene, 1, body.position(),
            { moment: "lit", target: String(actor.ref()), motes: mark ? mark.motes : 20,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 4)) : 1 }, 40);
    });

    // 照明被清掉时收回 mark（mark 的 end 负责光散去）。
    WorldCombat.on("world_combat:move_spotlight/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== spotlightEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, spotlightMark);
        for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: spotlightId, name: "聚光灯",
        description: "把一束光钉在对手身上：它在照明期间受到的所有伤害更重，并成为全场焦点——施法者一侧的生物会被指向它。照明有时限。",
        uses: ["给全队标出优先集火目标", "在集火前先把它照得更脆", "把靠近的敌群牵向同一个目标"],
        kind: "enemy", range: 12, maxRange: 14,
        prepare: 8, active: 0, recover: 7, cooldown: 70, style: "beam",
        defaults: { mode: 0 },
        fields: [field(pathOf("mode"), "聚光方式", "choice", { options: [
            { value: 0, label: "穿刺" }, { value: 1, label: "钉住" }] })],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[spotlightId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.max(3, Math.round(p(spotlightId, "tempo", context))),
                recover: Math.round(p(spotlightId, "aftercast", context)),
                cooldown: Math.round(p(spotlightId, "recharge", context)),
                active: 0, range: p(spotlightId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(spotlightId, "reach", pokemon) : 12, geometry: "line", style: "beam",
                color: 0xFFF0A8, label: config && config.mode === 1 ? "聚光灯·钉住" : "聚光灯·穿刺" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_spotlight:windup", spotlightScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const body = world.observe(self), lit = world.observe(target);
            const bonus = Math.max(0.1, Math.min(0.5, p(spotlightId, "expose", action)));
            const ticks = Math.max(80, Math.round(p(spotlightId, "spotTicks", action)));
            const radius = Math.max(1.5, p(spotlightId, "sweepRadius", action));
            const motes = Math.max(8, Math.round(p(spotlightId, "motes", action)));
            MobEffects.apply(world, target, spotlightEffect, ticks, 0);
            const marks = world.effects(target, spotlightMark);
            for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
            world.effect(spotlightMark, target, JSON.stringify({ bonus: bonus, radius: radius, motes: motes, caster: String(self.ref()) }), ticks);
            sound(action, "minecraft:block.beacon.activate");
            if (body !== null && lit !== null) {
                WorldFeedback.emit(world, spotlightScene, 1, lit.position(),
                    { moment: "beam", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                        bonus: bonus, motes: motes, scale: Math.max(0.6, Math.min(2, radius / 4)) }, 26);
                WorldFeedback.text(world, spotlightAbove(lit.position()), spotlightBeamText, [Math.round(bonus * 100)], 28);
            }
            done(action);
        }
    });
}
