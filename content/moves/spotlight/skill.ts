/**
 * 聚光灯 / Spotlight —— 执行组织。
 *
 * 核心念头：一束光从你手里打出去钉在一个生物身上。它被照得无处可躲——落在它身上的伤害更重，
 *   而且它成为全场焦点：与它敌对的生物会被指向它，向它集中。照住敌人＝给全队标出集火目标；
 *   照住队友＝把周围敌人的火力引到它身上，但要接受它也会被打得更痛这份代价。
 *
 * 出手：短起手（windup 在掌心聚起一束光），提交后把光束沿两人画出来（beam，用 data.path）。
 * 选取：`kind: "aim"`——可选友方或敌方实体；空点拒绝，起手前校验射程与视线。真正的阵营判断在提交后，
 *   被照者与周围生物的敌对关系决定谁能被转向，不强迫任何玩家。
 * 命中：给目标挂共享身份 world_combat:status/spotlight（本单元效果 world_combat:spotlighted），
 *   并把暴露加成、扫过范围、光点数写进 world_combat:spotlight_mark。
 * 持续：带身份者受到的伤害更重（入场规则 ×(1+expose)），mark 每 20 刻把被照者周围与它敌对的生物指向它
 *   （world.target），让「只瞄准它」真正落在行为上；只有真的被改目标的生物才向它牵出一条短线。
 *   被照者与 mark 的持续亮光绑定在同一 mark 效果上，提前驱散时一起收场。
 * 结束：照明走完或被清掉时收回 mark，光安静散去。两种方式都不消耗目标身上的效果，只按时间走。
 * 反制：照明有时限，避开这段时间就能少挨；目标也可以拉开距离，让敌人够不到它。
 *   能免疫转向的 Boss（world.target 拒绝）只会吃到合法的易伤，不会出现假的仇恨线。
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
        const radius = Math.max(1, Number(data.radius) || 4);
        const found = world.query(body.position(), radius, false);
        let lured = 0;
        for (let i = 0; i < found.length; i++) {
            const other = found[i];
            if (String(other.ref()) === String(target.ref())) continue;
            const observed = world.observe(other);
            if (observed === null || observed.player() || observed.health() <= 0) continue;
            // 以被照者的阵营关系判断：与它同为盟友的生物不会被转向。
            if (world.allied(other, target)) continue;
            // world.target 拒绝（如免疫转向的 Boss）时视为合法但无效：不计数、不画线。
            if (!world.target(other, target)) continue;
            lured++;
            WorldFeedback.keep(world, "world_combat:move_spotlight/link/" + String(other.ref()), spotlightScene, 1,
                body.position(), { moment: "link", target: String(target.ref()), other: String(other.ref()),
                    path: [String(other.ref()), String(target.ref())], lured: lured }, 30);
        }
        // 被照者的持续亮光绑定在 mark 效果上，随它自然到期或提前驱散一起结束。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_spotlight/lit", spotlightScene, 1, body.position(),
            { moment: "lit", target: String(target.ref()), motes: Math.max(8, Math.round(Number(data.motes) || 20)),
                scale: Math.max(0.6, Math.min(2, radius / 4)), lured: lured });
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

    // 曝光：被照亮的活体受到的伤害 ×(1+expose)，不消耗照明。闪烁贴在实际受击点由 damage_applied 负责。
    NativeEffects.incomingRules.define({ id: "world_combat:move_spotlight/expose", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0)) return;
        const world = hit.world, target = hit.target, source = hit.source;
        if (!world.valid(target) || String(source.ref()) === String(target.ref())) return;
        if (!CombatStatus.has(world, target, spotlightStatus)) return;
        const mark = spotlightMarkOf(world, target);
        const bonus = mark ? Math.max(0.05, Number(mark.bonus) || 0.15) : 0.15;
        data.amount *= 1 + bonus;
    } });

    // 每次实际扣伤都在真实受击点闪一下，并告诉玩家加成还有多少。
    WorldCombat.on("world_combat:move_spotlight/flare", "world_combat:damage_applied", "", function (event) {
        const target = event.target(), world = event.world(), source = event.actor();
        if (target === null || !world.valid(target) || String(source.ref()) === String(target.ref())) return;
        if (!CombatStatus.has(world, target, spotlightStatus)) return;
        const receipt = WorldFeedback.receipt(event);
        if (receipt === null) return;
        const mark = spotlightMarkOf(world, target);
        const bonus = mark ? Math.max(0.05, Number(mark.bonus) || 0.15) : 0.15;
        WorldFeedback.emit(world, spotlightScene, 1, receipt.point,
            { moment: "flare", target: String(target.ref()), bonus: bonus, burst: Math.round(14 + bonus * 60),
                point: [receipt.point.x(), receipt.point.y(), receipt.point.z()] }, 20);
        WorldFeedback.text(world, receipt.point.plus(WorldCombat.point(0, 0.9, 0)), spotlightFlareText, [Math.round(bonus * 100)], 18);
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
        id: spotlightId,
        cooldownParameter: "recharge", name: "聚光灯",
        description: "把一束光钉在一个生物身上：照明期间它受到的所有伤害更重，并成为全场焦点——与它敌对的周围生物会被引向它。照住敌人可给全队标出集火目标，照住队友则把火力引到它身上（代价是它也会被打得更痛）。需要看得见的生物目标，空放无效，照明有时限。",
        uses: ["给全队标出优先集火目标", "在集火前先把它照得更脆", "照住一名耐打的队友，把周围敌人的火力引到它身上"],
        kind: "aim", range: 12, maxRange: 14,
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
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) return "choose-target";
            if (String(target.ref()) === String(self.ref())) return "invalid-target";
            const body = world.observe(target);
            if (body === null || body.health() <= 0) return "invalid-target";
            if (!world.clear(action.origin(), body.position())) return "target-not-visible";
            return "";
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
            if (body === null || lit === null) { done(action); return; }
            const friendly = world.friendly(target);
            const bonus = Math.max(0.1, Math.min(0.5, p(spotlightId, "expose", action)));
            const ticks = Math.max(80, Math.round(p(spotlightId, "spotTicks", action)));
            const radius = Math.max(1.5, p(spotlightId, "sweepRadius", action));
            const motes = Math.max(8, Math.round(p(spotlightId, "motes", action)));
            MobEffects.apply(world, target, spotlightEffect, ticks, 0);
            const marks = world.effects(target, spotlightMark);
            for (let i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
            world.effect(spotlightMark, target, JSON.stringify({ bonus: bonus, radius: radius, motes: motes, caster: String(self.ref()) }), ticks);
            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, spotlightScene, 1, lit.position(),
                { moment: "beam", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    bonus: bonus, motes: motes, scale: Math.max(0.6, Math.min(2, radius / 4)) }, 26);
            WorldFeedback.text(world, spotlightAbove(lit.position()), friendly ? spotlightFriendText : spotlightBeamText,
                [Math.round(bonus * 100)], 28);
            done(action);
        }
    });

    WorldCombat.preview("world_combat:spotlight", JSON.stringify({ lineOfSight: true }));
}
