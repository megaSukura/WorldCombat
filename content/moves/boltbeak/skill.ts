/**
 * 电喙 / boltbeak 的出手方式。
 *
 * 核心念头：抢在对手反应之前，用带电的喙直线啄上去——只要这一口比对手先到，威力翻倍；啄完立刻退开。
 *
 * 三幕：
 *   起（charge，提交前）：喙尖蓄电、弧光聚成一点（present charge）。
 *   啄（dart → strike / first）：沿瞄准方向逐刻高速突刺，撞上的一刻结算 peck；实际碰到的目标尚未打过施法者时翻倍，
 *       画面换成更亮的电并浮出「先手电喙！」；目标身上短暂留电花。扑空则冲到头收势。
 *   抽（withdraw）：主前冲发射器立即停止，身体沿受碰撞限制的真实路径向后抽身，读实际终点。
 *
 * 选取：`kind: "aim"`——可点实体也可点方向/世界点空啄；首个阻挡的身体照常吃啄、墙停，不要求提交时存在敌人。
 *
 * 与同族分开：鳃咬是贴身咬住、拖拽降速；电喙是点到即走的直线电啄，靠「先手 + 退开」反复占先。
 */
namespace PokemonSkills {
    const boltbeakFirstText = "world_combat.move.boltbeak.text.first";
    const boltbeakHitText = "world_combat.move.boltbeak.text.hit";
    const boltbeakMissText = "world_combat.move.boltbeak.text.miss";

    define({
        freeMovement: true,
        id: boltbeakId,
        cooldownParameter: "recharge",
        name: "Bolt Beak",
        description: "抢在对手反应之前，用带电的喙直线啄上去：目标尚未打过施法者时威力翻倍；啄完沿受碰撞限制的路径退步拉开。",
        uses: ["抢在对手出手前先啄一口", "打一下立刻退开脱离", "对还没反应过来的目标打出翻倍"],
        kind: "aim",
        range: 4.4,
        maxRange: 8,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "electric",
        defaults: { skirmish: false, ai: { maxChase: 10, leadFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(boltbeakId, "collisionRadius", pokemon) * 1.4, geometry: "line", style: "electric", color: 0xFFE066,
                label: config && config.skirmish === true ? "电喙·游斗" : "电喙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[boltbeakId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(boltbeakId, "tempo", context)),
                recover: Math.round(p(boltbeakId, "settle", context)),
                cooldown: Math.round(p(boltbeakId, "recharge", context)),
                active: 0,
                range: p(boltbeakId, "dart", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("boltbeak:charge", boltbeakScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", skirmish: config && config.skirmish === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(boltbeakScene);
            // 突刺贴地走：方向取水平分量，避免身体贴着地面时被地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            const length = p(boltbeakId, "dart", action);
            const step = p(boltbeakId, "speed", action);
            const radius = p(boltbeakId, "collisionRadius", action);
            const backstep = p(boltbeakId, "backstep", action);
            const minimumMove = p(boltbeakId, "minimumMove", action);
            const scale = radius / 0.4;
            let travelled = 0, retreatDone = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, boltbeakScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), boltbeakMissText, [], 22);
                }
                finish(current);
            }

            /** 抽身：停掉主前冲发射器后，身体沿真实路径一小段一小段后退，读实际终点。 */
            function withdraw(current: CombatAction, remaining: number): void {
                if (settled || remaining <= 0.001) { finish(current); return; }
                const scope = current.world();
                const backward = direction.scale(-1);
                const chunk = Math.min(0.7, remaining);
                const swept = sweepStep(current, backward.scale(chunk), radius);
                const moved = swept.moved;
                retreatDone += moved;
                const body = scope.observe(current.actor());
                if (body !== null) movementScenes.show(current, "withdraw", body.position(),
                    { moment: "withdraw", direction: [backward.x(), backward.y(), backward.z()],
                        retreated: Math.round(retreatDone * 100) / 100, scale: scale });
                if (swept.hit.blocked() || moved < minimumMove || remaining - moved <= 0.001) { finish(current); return; }
                current.after(1, function (later: CombatAction) { withdraw(later, remaining - moved); });
            }

            function retreat(current: CombatAction): void {
                movementScenes.stop(current, "dart");
                withdraw(current, backstep);
            }

            sound(action, "cobblemon:move.thunderbolt.actor");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.001) { whiff(current); return; }
                const delta = direction.scale(Math.min(step, remaining));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(boltbeakId, "peck", current);
                        // 先手加成只按实际碰到的那个目标判断。
                        const doubled = boltbeakLead(withTarget(factContext(current), victim)) > 0;
                        const count = Math.round(14 + power / 3);
                        const landed = impact(current, hit, boltbeakId, power, { damage: damageSpec(boltbeakId, "peck"), contact: true });
                        // 伤害被拒绝时不冒称先手命中：只在接触点冒一下电失效，照常抽身。
                        if (landed) {
                            WorldFeedback.emit(scope, boltbeakScene, 1, hit.position(),
                                { moment: doubled ? "first" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                    power: Math.round(power * 10) / 10, count: count, scale: scale }, 28);
                            scope.sound(doubled ? "minecraft:entity.lightning_bolt.impact" : "cobblemon:impact.electric", hit.position(), 16, "{}");
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                                doubled ? boltbeakFirstText : boltbeakHitText, [], 24);
                            if (scope.valid(victim)) {
                                WorldFeedback.keep(scope, "boltbeak:static:" + String(victim.ref()), boltbeakScene, 1, hit.position(),
                                    { moment: "static", target: String(victim.ref()), scale: scale, sparks: Math.round(6 + power / 12) }, 30);
                            }
                        } else {
                            WorldFeedback.emit(scope, boltbeakScene, 1, hit.position(), { moment: "miss", scale: scale }, 18);
                        }
                    }
                    current.after(2, function (later: CombatAction) { retreat(later); });
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                movementScenes.show(current, "dart", here, { moment: "dart", scale: scale, charge: Math.min(1, travelled / Math.max(0.001, length)),
                        sparks: Math.round(10 + Math.min(1, travelled / Math.max(0.001, length)) * 40) });
                if (hit.blocked() || moved < minimumMove) { whiff(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
