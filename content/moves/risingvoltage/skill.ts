/**
 * 电力上升 / risingvoltage —— 注册与动作。
 *
 * 核心念头：顿足把电按进地皮，电流沿地面窜到一处固定的落点，再从那里竖起一根电柱从下往上击穿；
 *   站在落点上的人脚下若带着电场的电荷（共享身份 world_combat:status/electricterrain），这一柱翻倍、也更粗更高。
 *
 * 三幕：
 *   起（coil，提交前）：施法者顿足，脚边的地纹亮起、电弧在腿侧打转，只播预告。
 *   爬（crawl，提交后）：电流从脚下沿地面逐刻窜向**出手时锁定的柱底**，前端端点始终等于柱底（画面是一条会生长的爬行电线）。
 *   升（pillar / hit）：落点竖起电柱，半径 `columnRadius`、高 `columnHeight` 内的非友方各挨一次 `bolt`
 *       （脚下带电者翻倍，每人各算各的）；柱底不再跟着目标横移——目标走了，电柱仍在锁定的那一点升起。
 *
 * 与同族分开：精神剑是贴身电光刺、加成来自施法者自己脚下的电荷；电力上升是隔空从**锁定落点**升起的电柱。
 */
namespace PokemonSkills {
    function risingvoltageStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        const world = action.world();
        const actor = action.actor();
        const self = world.observe(actor);
        if (self === null) { done(action); return; }
        const origin = self.position();
        // 柱底在出手时就锁定：实体目标取它此刻脚下，点选则取所选点；提交后不再沿目标横移。
        const aimPoint = action.targetPosition();
        const watched = action.target();
        const watchedBody = watched !== null && world.valid(watched) ? world.observe(watched) : null;
        const feetY = watchedBody !== null ? watchedBody.position().y() - watchedBody.height() / 2 : aimPoint.y();
        const base = WorldCombat.point(aimPoint.x(), Math.floor(feetY), aimPoint.z());
        if (typeof action.releaseTarget === "function") action.releaseTarget();
        const crawl = Math.max(0.6, p(risingvoltageId, "crawl", action));
        const power = p(risingvoltageId, "bolt", action);
        const radius = Math.max(0.6, p(risingvoltageId, "columnRadius", action));
        const height = Math.max(2, p(risingvoltageId, "columnHeight", action));
        const arcs = Math.max(8, Math.round(p(risingvoltageId, "arcs", action)));
        const perTarget = damageFeatures(risingvoltageId, "bolt");
        const scale = radius / risingvoltageReference;
        const delta = base.minus(origin);
        const delay = Math.max(2, Math.round(delta.length() / crawl));
        const scenes = WorldFeedback.actionScenes(risingvoltageScene);

        sound(action, "cobblemon:move.thundershock.actor");

        function arr(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

        function rise(current: CombatAction): void {
            const scope = current.world();
            scenes.stop(current, "crawl");
            const region = WorldGeometry.ring(base, 0, radius, { below: 1.2, above: height });
            let hits = 0, chargedHits = 0;

            WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                const charged = risingvoltageCharged(scope, enemy);
                if (!hurt(current, enemy, risingvoltageId, power,
                    { damage: damageSpec(risingvoltageId, "bolt"), resolve: perTarget.resolve })) return;
                hits++;
                if (charged) chargedHits++;
                WorldFeedback.emit(scope, risingvoltageScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), charged: charged ? 1 : 0, arcs: arcs,
                        scale: scale * (charged ? 1.2 : 1), intensity: charged ? 1.8 : 1 }, 24);
                scope.sound("cobblemon:impact.electric", facts.position(), 14, "{}");
            });

            scope.sound("minecraft:entity.lightning_bolt.impact", base, 18, "{}");
            WorldFeedback.emit(scope, risingvoltageScene, 1, base,
                { moment: "pillar", radius: radius, height: height, arcs: arcs, hits: hits, charged: chargedHits,
                    scale: scale, rise: height / 3.6 }, 40);
            WorldFeedback.text(scope, base.plus(WorldCombat.point(0, Math.min(height, 4) * 0.7, 0)),
                chargedHits > 0 ? risingvoltageChargedText : (hits > 0 ? risingvoltageHitText : risingvoltageMissText),
                hits > 0 ? [hits] : [], 30);
            scenes.finish(current, done);
        }

        // 电流逐刻沿地面向前端推进；前端端点等于锁定的柱底，不沿目标移动。
        function crawlStep(current: CombatAction, step: number): void {
            const front = origin.plus(delta.scale(Math.min(1, (step + 1) / delay)));
            scenes.show(current, "crawl", origin,
                { moment: "crawl", path: [arr(origin), arr(front)], arcs: arcs, scale: scale });
            if (step + 1 >= delay) { rise(current); return; }
            current.after(1, function (next: CombatAction): void { crawlStep(next, step + 1); });
        }

        crawlStep(action, 0);
    }

    define({
        id: risingvoltageId,
        cooldownParameter: "recharge",
        name: "电力上升",
        description: "先顿足把电按进地面，电流窜到出手时锁定的落点，再从那里向上竖起一根电柱；落点上脚下带着电场电荷的人这一柱威力翻倍、也更粗更高，柱内的非友方会被一起贯穿。落点不再跟着目标横移。",
        uses: ["惩罚站在电气场地上的对手", "隔空从锁定落点升起一柱电击", "一次贯穿挤在落点附近的一圈人"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "electric",
        defaults: { overcharge: false, ai: { maxChase: 17, seekCharged: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(risingvoltageId, "reach", pokemon) : 12, geometry: "line", style: "electric", color: 0xF8D030,
                label: config && config.overcharge === true ? "过载电力上升" : "电力上升" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[risingvoltageId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(risingvoltageId, "coil", context)),
                recover: Math.round(p(risingvoltageId, "settle", context)),
                cooldown: Math.round(p(risingvoltageId, "recharge", context)),
                active: 0,
                range: p(risingvoltageId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("risingvoltage:coil", risingvoltageScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", overcharge: config && config.overcharge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            // 空柱也能执行：没有敌人时电柱照样在所选落点升起，只是打不到人。
            risingvoltageStrike(action, done);
        }
    });
}
