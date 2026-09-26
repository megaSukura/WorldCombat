/**
 * 双翼 / dualwingbeat —— 出手方式。
 *
 * 核心念头：一记**俯冲双拍**。先振翅俯冲、一侧翼朝身前下方拍下去（第一拍把人拍开、给自己让出落点），再借势
 *   振翅上掀、另一侧翼以真实新身位向**身后上方**反拍（第二拍顺着上掀的弧把贴身追进来的对手掀回去）。招名里
 *   的"两下"是两只翅膀各一次；两拍方向相反、各自判定，第二拍不再因为第一拍命中而额外加威力。
 *
 * 幕：
 *   起（raise，提交前）：翅膀张开、气在身侧拢成将拍未拍的两道弧（`action.present`，可打断、不花 PP）。
 *   下（downstroke，提交后）：第一拍。俯冲式下施法者朝目标冲进 `swoop` 格；翼弧罩住身前下方扇形，命中者挨一记
 *       `wing` 接触伤害并被拍开 `push` 格。
 *   上（upstroke）：`gap` 之后第二拍。俯冲式下施法者退回 `rise` 格，随后从新的身位朝上方与身后反拍一次；
 *       两拍各用自己算出的方向与竖直带判定，走出弧面的人自然躲开。
 *   收（settle）：收翅的余风。
 *
 * 选取：`kind: "aim"`——方向或世界点都能拍，空放照常完成两拍；目标离开只是第一拍拍空，动作仍按两拍走完。
 *
 * 与同族分开：二连劈是站定垂直下砸、两刀同向；二连击是原地左右回扫；只有双翼是**掠飞式、施法者自身在俯冲与
 *   拉升之间移动、两翼前后反向的两拍**，反制方式是在两拍之间走出翼弧、或趁它俯冲贴近后反打。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：把两翼摊到身体两侧；方向接近竖直时退化为世界 X 轴。 */
    function dualwingbeatSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    /** 第二拍的反拍方向：水平向后、并抬起一个上掀分量，代表上冲翼锋。 */
    function dualwingbeatCounter(direction: CombatPoint): CombatPoint {
        const back = WorldCombat.point(-direction.x(), 0, -direction.z());
        const flat = back.length() < 0.001 ? WorldCombat.point(0, 0, 1) : back.unit();
        return WorldCombat.point(flat.x(), 0.7, flat.z()).unit();
    }

    define({
        freeMovement: true,
        id: dualwingbeatId,
        cooldownParameter: "recharge",
        name: "Dual Wingbeat",
        description: "张开双翼俯冲而下：一只翅膀先向身前下方拍下去、把目标拍开，另一只翅膀在上掀时从新身位向身后上方反拍。俯冲式贴脸更重、把身位交出去；悬停式隔空拍出风压、射程更远。",
        uses: ["一次俯冲、两只翅膀各拍一下", "先向前下拍开，再向后上掀回到身后", "把身前一小片扇区里的对手扫开"],
        kind: "aim",
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
            const push = p("dualwingbeat", "push", action);
            const swoop = p("dualwingbeat", "swoop", action);
            const rise = p("dualwingbeat", "rise", action);
            const feathers = Math.max(8, Math.round(p("dualwingbeat", "feathers", action)));
            const cap = Math.max(1, Math.round(p("dualwingbeat", "maxTargets", action)));
            const downBand = { below: 1.2, above: 2.8 };
            const upBand = { below: 1.6, above: 3.4 };
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function beat(current: CombatAction, index: number): void {
                const scope = current.world();
                const before = scope.observe(actor);
                if (before === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { beat(next, 1); });
                    return;
                }
                const forward = aim(current);
                if (dive && index === 0) {
                    const gapToTarget = Math.max(0, current.targetPosition().minus(before.position()).length() - 1.0);
                    scope.displace(actor, forward.scale(Math.min(swoop, gapToTarget)));
                } else if (dive && index === 1) {
                    scope.displace(actor, WorldCombat.point(-forward.x(), 0.12, -forward.z()).unit().scale(rise));
                }
                const here = scope.observe(actor);
                const origin = here === null ? before.position() : here.position();
                // 第一拍向前下扫，第二拍从真实新身位向后上反拍：两拍方向与竖直带都不同，各自判定。
                const stroke = index === 0 ? forward : dualwingbeatCounter(forward);
                const band = index === 0 ? downBand : upBand;
                const direction = [stroke.x(), stroke.y(), stroke.z()];
                const side = dualwingbeatSide(forward);
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                    { moment: index === 0 ? "downstroke" : "upstroke", index: index + 1, wings: 2, reach: reach, span: span,
                        radius: strokeRadius, feathers: feathers, dive: dive ? 1 : 0, direction: direction }, 22);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, stroke, reach, span, band), function (victim, facts) {
                    if (hits >= cap) return;
                    if (!hurt(current, victim, dualwingbeatId, power, { damage: damageSpec(dualwingbeatId, "wing"), contact: true })) return;
                    hits++;
                    const at = scope.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    if (scope.valid(victim)) {
                        const flat = WorldCombat.point(stroke.x(), 0, stroke.z());
                        const away = flat.length() < 0.001 ? WorldCombat.point(point.x() - origin.x(), 0, point.z() - origin.z()) : flat;
                        if (away.length() >= 0.05) scope.hitDisplace(victim, away.unit().scale(index === 0 ? push : push * 0.6));
                    }
                    WorldFeedback.emit(scope, dualwingbeatScene, 1, point,
                        { moment: index === 0 ? "strike1" : "strike2", target: String(victim.ref()), index: index + 1, feathers: feathers,
                            radius: strokeRadius, flank: side.x() * strokeRadius, intensity: Math.max(0.5, Math.min(2, power / 55)) }, 22);
                    scope.sound("cobblemon:impact.flying", point, 14, "{}");
                });
                if (index === 0) {
                    if (hits === 0) WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                        { moment: "miss1", direction: direction, reach: reach, span: span, feathers: feathers }, 18);
                    current.after(gap, function (next: CombatAction) { beat(next, 1); });
                    return;
                }
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin.plus(stroke.scale(reach * 0.5)),
                    { moment: "settle", reach: reach, span: span, feathers: feathers }, 18);
                finish(current);
            }

            sound(action, "cobblemon:animation.plumage.wing_flap.medium");
            if (dive) sound(action, "minecraft:entity.phantom.swoop");
            beat(action, 0);
        }
    });
}
