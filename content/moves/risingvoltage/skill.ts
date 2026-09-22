/**
 * 电力上升 / risingvoltage —— 注册与动作。
 *
 * 核心念头：顿足把电按进地皮，电流沿地面窜到对手脚下，再从那里竖起一根电柱从下往上击穿；
 *   目标脚下若带着电场的电荷（共享身份 world_combat:status/electricterrain），这一柱翻倍、也更粗更高。
 *
 * 三幕：
 *   起（coil，提交前）：施法者顿足，脚边的地纹亮起、电弧在腿侧打转，只播预告。
 *   爬（crawl，提交后）：电流沿地面窜向目标脚下，爬行速度决定到达时刻（画面是一条爬行电线）。
 *   升（pillar / hit）：落点竖起电柱，半径 `columnRadius`、高 `columnHeight` 内的非友方各挨一次 `bolt`
 *       （脚下带电者翻倍，每人各算各的）；目标中途离场则电柱在最后落点原地升起。
 *
 * 与同族分开：精神剑是贴身电光斩、加成来自施法者自己脚下的电荷；电力上升是隔空从**目标**脚下升起的电柱。
 */
namespace PokemonSkills {
    function risingvoltageStrike(action: CombatAction, targetRef: string, done: (current: CombatAction) => void): void {
        const world = action.world();
        const actor = action.actor();
        const crawl = Math.max(0.6, p(risingvoltageId, "crawl", action));
        const power = p(risingvoltageId, "bolt", action);
        const radius = Math.max(0.6, p(risingvoltageId, "columnRadius", action));
        const height = Math.max(2, p(risingvoltageId, "columnHeight", action));
        const arcs = Math.max(8, Math.round(p(risingvoltageId, "arcs", action)));
        const perTarget = damageFeatures(risingvoltageId, "bolt");
        const scale = radius / risingvoltageReference;
        const fallback = action.targetPosition();
        const self = world.observe(actor);
        const origin = self !== null ? self.position() : action.origin();
        const first = world.actor(targetRef);
        const firstBody = first !== null && world.valid(first) ? world.observe(first) : null;
        const startDistance = firstBody !== null ? firstBody.position().minus(origin).length() : fallback.minus(origin).length();
        const delay = Math.max(2, Math.round(startDistance / crawl));

        sound(action, "cobblemon:move.thundershock.actor");
        WorldFeedback.emit(world, risingvoltageScene, 1, origin,
            { moment: "crawl", path: [String(actor.ref()), targetRef], delay: delay, arcs: arcs, scale: scale }, delay + 20);

        action.after(delay, function (current: CombatAction): void {
            const scope = current.world();
            const victim = scope.actor(targetRef);
            const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
            const at = body !== null ? body.position() : fallback;
            const base = WorldCombat.point(at.x(), at.y() - (body !== null ? body.height() / 2 : 0), at.z());
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
                        scale: scale, intensity: charged ? 1.8 : 1 }, 24);
                scope.sound("cobblemon:impact.electric", facts.position(), 14, "{}");
            });

            scope.sound("minecraft:entity.lightning_bolt.impact", base, 18, "{}");
            WorldFeedback.emit(scope, risingvoltageScene, 1, base,
                { moment: "pillar", radius: radius, height: height, arcs: arcs, hits: hits, charged: chargedHits,
                    scale: scale, rise: height / 3.6 }, 40);
            WorldFeedback.text(scope, base.plus(WorldCombat.point(0, Math.min(height, 4) * 0.7, 0)),
                chargedHits > 0 ? risingvoltageChargedText : (hits > 0 ? risingvoltageHitText : risingvoltageMissText),
                hits > 0 ? [hits] : [], 30);
            done(current);
        });
    }

    define({
        id: risingvoltageId,
        name: "电力上升",
        description: "先顿足把电按进地面，电流窜到对手脚下再向上竖起一根电柱；目标脚下带着电场的电荷时，这一柱的威力翻倍、也更粗更高，站在近旁的人会被一起贯穿。",
        uses: ["惩罚站在电气场地上的对手", "隔空从对手脚下升起一柱电击", "一次贯穿挤在落点附近的一圈人"],
        kind: "enemy",
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
            const target = action.target();
            if (target === null) { done(action); return; }
            risingvoltageStrike(action, String(target.ref()), done);
        }
    });
}
