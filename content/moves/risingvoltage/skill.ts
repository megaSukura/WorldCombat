/**
 * 电力上升 / risingvoltage —— 注册与动作。
 *
 * 核心念头：顿足把电按进地皮，电流沿真实地表窜到一处固定的落点，再从那里竖起一根电柱从下往上击穿；
 *   站在落点上、此刻真的脚踏电气场地的人这一柱翻倍、也更粗更高。
 *
 * 三幕：
 *   起（coil，提交前）：施法者顿足，脚边的地纹亮起、电弧在腿侧打转，只播预告。
 *   爬（crawl，提交后）：电流从脚下沿原生地表逐刻窜向出手时锁定的落点；前端端点始终落在真实支撑面上，
 *       撞墙、断口或过陡台阶就停在上一段，电柱只在实际走到的地表升起。
 *   升（pillar / hit）：落点竖起电柱，半径 `columnRadius`、高 `columnHeight` 内的非友方各挨一次 `bolt`
 *       （从柱底到该目标无遮挡、且此刻站在真实电气场地上的人才翻倍，每人各算各的）；目标走了，电柱仍在锁定点升起。
 *
 * 与同族分开：精神剑是贴身电光刺、加成来自施法者自己脚下的电荷；电力上升是隔空从**锁定落点**升起的电柱。
 */
namespace PokemonSkills {
    /** 沿真实支撑路径取到 `ratio` 处的折线前缀（判定与表现共用这一组地表端点）。 */
    function risingvoltagePrefix(path: CombatPoint[], ratio: number): CombatPoint[] {
        if (path.length === 0) return [WorldCombat.point(0, 0, 0)];
        if (path.length === 1) return path.slice();
        const segments = path.length - 1, position = Math.max(0, Math.min(1, ratio)) * segments, whole = Math.floor(position);
        const out: CombatPoint[] = [];
        for (let i = 0; i <= whole && i < path.length; i++) out.push(path[i]);
        if (whole < segments) {
            const f = position - whole, a = path[whole], b = path[whole + 1];
            out.push(a.plus(b.minus(a).scale(f)));
        }
        return out;
    }

    function risingvoltageStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        const world = action.world();
        const actor = action.actor();
        const self = world.observe(actor);
        if (self === null) { done(action); return; }
        const origin = self.position();
        const feet = WorldCombat.point(origin.x(), self.boundsMin().y(), origin.z());
        // 落点的 x/z 在出手时锁定：实体目标取它此刻脚下，点选则取所选点；提交后不再沿目标横移。
        const aimPoint = action.targetPosition();
        const start = SurfacePaths.support(world, feet, 0.6, 3) || feet;
        const heading = WorldGeometry.flatUnit(aimPoint.minus(start), WorldCombat.point(0, 0, 1));
        const dx = aimPoint.x() - start.x(), dz = aimPoint.z() - start.z();
        const distance = Math.sqrt(dx * dx + dz * dz);
        // 电流只沿真实可走地表前进：墙、断口、过陡台阶让 SurfacePaths 提前结束，电柱就在实际到达处升起。
        const walked = SurfacePaths.advance(world, start, heading, distance,
            { up: 1, down: 1, spacing: 0.35, samples: Math.max(2, Math.ceil(distance / 0.35) + 2) });
        const base = walked.point;
        const path = walked.path;
        if (walked.travelled < 0.5 && distance > 1.0) {
            WorldFeedback.emit(world, risingvoltageScene, 1, start,
                { moment: "crawl", path: path.map(function (point) { return [point.x(), point.y(), point.z()]; }), arcs: p(risingvoltageId, "arcs", action), scale: 0.6 }, 16);
            WorldFeedback.text(world, start.plus(WorldCombat.point(0, 1.0, 0)), risingvoltageMissText, [], 24);
            done(action); return;
        }
        if (typeof action.releaseTarget === "function") action.releaseTarget();
        const crawl = Math.max(0.6, p(risingvoltageId, "crawl", action));
        const power = p(risingvoltageId, "bolt", action);
        const radius = Math.max(0.6, p(risingvoltageId, "columnRadius", action));
        const height = Math.max(2, p(risingvoltageId, "columnHeight", action));
        const arcs = Math.max(8, Math.round(p(risingvoltageId, "arcs", action)));
        const perTarget = damageFeatures(risingvoltageId, "bolt");
        const scale = radius / risingvoltageReference;
        const delay = Math.max(2, Math.round(Math.max(0.6, walked.travelled) / crawl));
        const scenes = WorldFeedback.actionScenes(risingvoltageScene);

        sound(action, "cobblemon:move.thundershock.actor");

        function arr(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

        function rise(current: CombatAction): void {
            const scope = current.world();
            scenes.stop(current, "crawl");
            const region = WorldGeometry.ring(base, 0, radius, { below: 1.2, above: height });
            let hits = 0, chargedHits = 0;

            WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                // 柱体候选逐一核对：从柱底到该目标无遮挡；隔墙、楼上不同层的不被这一柱贯穿。
                if (!scope.clear(base, facts.position())) return;
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
                { moment: "pillar", radius: radius, height: height, arcs: arcs, charge: arcs,
                    chargedShell: chargedHits > 0 ? arcs : 0, hits: hits, charged: chargedHits,
                    scale: scale, rise: height / 3.6 }, 40);
            WorldFeedback.text(scope, base.plus(WorldCombat.point(0, Math.min(height, 4) * 0.7, 0)),
                chargedHits > 0 ? risingvoltageChargedText : (hits > 0 ? risingvoltageHitText : risingvoltageMissText),
                chargedHits > 0 ? [chargedHits] : hits > 0 ? [hits] : [], 30);
            scenes.finish(current, done);
        }

        // 电流逐刻沿真实地表向前端推进；前端端点落在支撑面上，不再从身体斜连地面。
        function crawlStep(current: CombatAction, step: number): void {
            const ratio = Math.min(1, (step + 1) / delay);
            scenes.show(current, "crawl", start,
                { moment: "crawl", path: risingvoltagePrefix(path, ratio).map(arr), arcs: arcs, charge: arcs, scale: scale });
            if (step + 1 >= delay) { rise(current); return; }
            current.after(1, function (next: CombatAction): void { crawlStep(next, step + 1); });
        }

        crawlStep(action, 0);
    }

    define({
        id: risingvoltageId,
        cooldownParameter: "recharge",
        name: "电力上升",
        description: "先顿足把电按进地面，电流沿真实地表窜到出手时锁定的落点，再从那里向上竖起一根电柱；落点上此刻真的站在有效电气场地上的人这一柱威力翻倍、也更粗更高，柱内无遮挡的非友方会被一起贯穿。撞墙或断口时电柱只在实际走到处升起，落点不再跟着目标横移。",
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
            const charge = Math.max(8, Math.round(p(risingvoltageId, "arcs", action)));
            action.present("risingvoltage:coil", risingvoltageScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", overcharge: config && config.overcharge === true ? 1 : 0, charge: charge }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            // 空柱也能执行：没有敌人时电柱照样在所选落点升起，只是打不到人。
            risingvoltageStrike(action, done);
        }
    });
}
