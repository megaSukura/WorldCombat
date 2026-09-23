/**
 * 抛物面充电 / paraboliccharge 的出手方式。
 *
 * 核心念头：身周张开一顶电的抛物面——电弧从身上甩出去、沿弧线下弯，再从四周收回自己身上；
 *   每命中一个目标，就把那份伤害的一半抽回自身。打中的人越多，收回来的能量越足。
 *
 * 三幕：
 *   起（windup，提交前）：身上攒起细碎电花、脚边先亮起一圈虚线，只播预告。
 *   张（dish → surge / pull）：提交后电盘以自身为圆心张开（半径 `dish`），圈内敌人各挨一记 `surge`；
 *       每一记各自沿「目标→自身」抽出一道电光，伤害的一半经共享 `drain` 转回自身。
 *   收（reclaim）：电光收回身上，浮出这一发吸回了几道。
 *
 * 与家族分开：放电是瞬时向外迸开、附麻痹、不回血；只有抛物面充电是**先甩出去再收回来的盘**，
 *   以自己为中心范围吸收，把圈内每个目标都变成回血来源。它是全表最少人学的一招，参数因此摊得最开。
 *
 * 命中、防御、相性与暴击走共享 `hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 * 宝可梦、原版生物、玩家都按同一路径被电到与结算。
 */
namespace PokemonSkills {
    const parabolicchargeHitText = "world_combat.move.paraboliccharge.text.hit";
    const parabolicchargeReclaimText = "world_combat.move.paraboliccharge.text.reclaim";
    const parabolicchargeMissText = "world_combat.move.paraboliccharge.text.miss";

    define({
        id: parabolicchargeId,
        cooldownParameter: "recharge",
        name: "Parabolic Charge",
        description: "以自身为圆心张开的范围电击：圈内每个敌人各挨一记，每记伤害都按比例抽回自身——目标越多、回血越足。",
        uses: ["被围住时一次电到一圈并把伤害吸回来", "目标越多回血越足的续航手段", "在贴身混战里同时压低周围所有人"],
        kind: "self",
        range: 3.4,
        maxRange: 5.8,
        prepare: 9,
        active: 1,
        recover: 9,
        cooldown: 30,
        style: "parabola",
        defaults: { wide: false, ai: { maxChase: 7, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(parabolicchargeId, "dish", pokemon) : 3.4, geometry: "area", style: "parabola", color: 0xFFE96A,
                label: config && config.wide === true ? "抛物面充电·广角" : "抛物面充电" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[parabolicchargeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(parabolicchargeId, "charge", context)),
                recover: Math.round(p(parabolicchargeId, "settle", context)),
                cooldown: Math.round(p(parabolicchargeId, "recharge", context)),
                active: 1,
                range: p(parabolicchargeId, "dish", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:paraboliccharge:" + action.id(), parabolicchargeScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", radius: p(parabolicchargeId, "dish", action),
                    wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body === null ? action.origin() : body.position();
            const radius = Math.max(2.2, p(parabolicchargeId, "dish", action));
            const power = p(parabolicchargeId, "surge", action);
            const share = p(parabolicchargeId, "sap", action);
            const arcs = Math.max(3, Math.round(p(parabolicchargeId, "arcs", action)));
            const focus = Math.max(0.45, Math.min(1, p(parabolicchargeId, "focus", action)));
            const cap = Math.max(1, Math.round(p(parabolicchargeId, "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 3.4));
            const motes = Math.max(12, Math.round(power * 0.3 + radius * 8));
            let total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.keep(scope, "paraboliccharge:dish:" + String(current.actor().ref()), parabolicchargeScene, 1, centre,
                    { moment: "reclaim", radius: radius, arcs: arcs, focus: focus, targets: total, sap: Math.round(share * 100) }, 28);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    total > 0 ? parabolicchargeReclaimText : parabolicchargeMissText, total > 0 ? [total] : [], 28);
                done(current);
            }

            sound(action, "cobblemon:move.thunderbolt.actor");
            WorldFeedback.emit(world, parabolicchargeScene, 1, centre,
                { moment: "dish", radius: radius, arcs: arcs, focus: focus, motes: motes }, 30);
            sound(action, "cobblemon:impact.electric");

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 3 }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(action.actor().ref()) || total >= cap) return;
                const at = facts.position();
                const flow = centre.minus(at), span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                if (!hurt(action, enemy, parabolicchargeId, power,
                    { damage: damageSpec(parabolicchargeId, "surge"), drain: share })) return;
                total++;
                WorldFeedback.emit(world, parabolicchargeScene, 1, at,
                    { moment: "surge", target: ref, scale: scale, motes: motes, focus: focus,
                        intensity: Math.max(0.5, Math.min(2, power / 70)), count: Math.round(8 + power * 0.2) }, 22);
                WorldFeedback.emit(world, parabolicchargeScene, 1, at,
                    { moment: "pull", target: ref, path: ["target", "source"],
                        direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, sap: Math.round(share * 100) }, 26);
            });

            if (total === 0) WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), parabolicchargeMissText, [], 24);
            else WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), parabolicchargeHitText, [total], 24);
            finish(action);
        }
    });
}
