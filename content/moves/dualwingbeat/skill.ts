/**
 * 双翼 / dualwingbeat —— 出手方式。
 *
 * 核心念头：一记**俯冲双拍**。先振翅俯冲、一侧翼拍下去（第一拍把人拍开、给自己让出落点），再借势振翅上掀、
 *   另一侧翼从下方反拍（第二拍顺着第一拍掀出的空当补上，第一拍命中则这一下更重）。招名里的"两下"是两只
 *   翅膀各一次；它不是一次伤害结算两次，而是施法者自己在下潜与上扬之间移动的两拍。
 *
 * 幕：
 *   起（raise，提交前）：翅膀张开、气在身侧拢成将拍未拍的两道弧（`action.present`，可打断、不花 PP）。
 *   下（downstroke，提交后）：第一拍。俯冲式下施法者朝目标冲进 `swoop` 格；翼弧罩住身前扇形，命中者挨一记
 *       `wing` 接触伤害并被拍开 `push` 格。
 *   上（upstroke）：`gap` 之后第二拍。俯冲式下施法者退回 `rise` 格；再次扫过扇区，第一拍命中者在这拍吃
 *       到 `wake` 加成。两拍都没扫到只留一道空风。
 *   收（settle）：收翅的余风。
 *
 * 与同族分开：双针是两枚针沿线先后射出、毒击是站定重刺；只有双翼是**掠飞式、施法者自身在俯冲与拉升之间
 *   移动**的两拍，反制方式是在两拍之间走出翼弧、或趁它俯冲贴近后反打。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：把两翼摊到身体两侧；方向接近竖直时退化为世界 X 轴。 */
    function dualwingbeatSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: dualwingbeatId,
        cooldownParameter: "recharge",
        name: "Dual Wingbeat",
        description: "The user slams the target with its wings to inflict damage. The target is hit twice in a row.",
        uses: ["一次俯冲、两只翅膀各拍一下", "先拍开再上掀，把同一个目标连吃两拍", "把身前一小片扇区里的对手扫开"],
        kind: "enemy",
        range: 5.6,
        maxRange: 6.5,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "wingbeat",
        defaults: { dive: false, ai: { maxChase: 12, finishLow: false, leaveStation: true } },
        fields: [flag("dive", "俯冲形态")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dualwingbeatId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dualwingbeat", "tempo", context)),
                recover: Math.round(p("dualwingbeat", "settle", context)),
                cooldown: Math.round(p("dualwingbeat", "recharge", context)),
                active: 0,
                range: p("dualwingbeat", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const feathers = Math.max(6, Math.round(p("dualwingbeat", "feathers", action)));
            action.present("dualwingbeat:raise:" + action.id(), dualwingbeatScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, wings: 2, feathers: feathers, dive: config && config.dive === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[dualwingbeatId], detail: { values: config } };
            return {
                radius: p("dualwingbeat", "reach", context), geometry: "cone", style: "wingbeat", color: 0xCFE7F2,
                label: config && config.dive === true ? "双翼·俯冲" : "双翼·悬停"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const dive = !!(config && config.dive === true);
            const power = p("dualwingbeat", "wing", action);
            const gap = Math.max(2, Math.round(p("dualwingbeat", "gap", action)));
            const reach = Math.max(2, action.range());
            const span = p("dualwingbeat", "span", action);
            const strokeRadius = p("dualwingbeat", "strokeRadius", action);
            const wake = p("dualwingbeat", "wake", action);
            const push = p("dualwingbeat", "push", action);
            const swoop = p("dualwingbeat", "swoop", action);
            const rise = p("dualwingbeat", "rise", action);
            const feathers = Math.max(8, Math.round(p("dualwingbeat", "feathers", action)));
            const cap = Math.max(1, Math.round(p("dualwingbeat", "maxTargets", action)));
            const band = { below: 1.2, above: 2.8 };
            let landedFirst = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function beat(current: CombatAction, index: number): void {
                const scope = current.world();
                const before = scope.observe(actor);
                if (before === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { beat(next, 1); });
                    return;
                }
                const direction = aim(current);
                if (dive && index === 0) {
                    const gapToTarget = Math.max(0, current.targetPosition().minus(before.position()).length() - 1.0);
                    scope.displace(actor, direction.scale(Math.min(swoop, gapToTarget)));
                } else if (dive && index === 1) {
                    scope.displace(actor, WorldCombat.point(-direction.x(), 0.12, -direction.z()).unit().scale(rise));
                }
                const here = scope.observe(actor);
                const origin = here === null ? before.position() : here.position();
                const heading = [direction.x(), direction.y(), direction.z()];
                const side = dualwingbeatSide(direction);
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                    { moment: index === 0 ? "downstroke" : "upstroke", index: index + 1, wings: 2, reach: reach, span: span,
                        radius: strokeRadius, feathers: feathers, dive: dive ? 1 : 0, direction: heading }, 22);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, span, band), function (victim, facts) {
                    if (hits >= cap) return;
                    const bonus = index === 1 && landedFirst ? 1 + wake : 1;
                    if (!hurt(current, victim, dualwingbeatId, power * bonus, { damage: damageSpec(dualwingbeatId, "wing"), contact: true })) return;
                    hits++;
                    if (index === 0) landedFirst = true;
                    const at = scope.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(point.x() - origin.x(), 0, point.z() - origin.z());
                        if (away.length() >= 0.05) scope.displace(victim, away.unit().scale(index === 0 ? push : -push * 0.6));
                    }
                    WorldFeedback.emit(scope, dualwingbeatScene, 1, point,
                        { moment: index === 0 ? "strike1" : "strike2", target: String(victim.ref()), index: index + 1, feathers: feathers,
                            radius: strokeRadius, flank: side.x() * strokeRadius, intensity: Math.max(0.5, Math.min(2, (power * bonus) / 55)) }, 22);
                    scope.sound("cobblemon:impact.flying", point, 14, "{}");
                });
                if (index === 0) {
                    if (hits === 0) WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                        { moment: "miss1", direction: heading, reach: reach, span: span, feathers: feathers }, 18);
                    current.after(gap, function (next: CombatAction) { beat(next, 1); });
                    return;
                }
                if (index === 1 && hits > 0 && landedFirst)
                    WorldFeedback.text(scope, origin.plus(direction.scale(reach * 0.4)).plus(WorldCombat.point(0, 1.0, 0)), dualwingbeatWakeText, [], 22);
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin.plus(direction.scale(reach * 0.5)),
                    { moment: "settle", reach: reach, span: span, feathers: feathers }, 18);
                finish(current);
            }

            sound(action, "cobblemon:animation.plumage.wing_flap.medium");
            if (dive) sound(action, "minecraft:entity.phantom.swoop");
            beat(action, 0);
        }
    });
}
