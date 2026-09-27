/**
 * 双翼 / dualwingbeat —— 出手方式。
 *
 * 核心念头：一记**俯冲双拍**。先振翅俯冲、一侧翼朝身前下方拍下去（第一拍把人拍开、给自己让出落点），再借势
 *   振翅上掀、另一侧翼以真实新身位向**身后上方**反拍（第二拍顺着上掀的弧把贴身追进来的对手掀回去）。招名里
 *   的"两下"是两只翅膀各一次；两拍方向相反、各自判定，第二拍不再因为第一拍命中而额外加威力。
 *
 * 幕：
 *   起（raise，提交前）：翅膀张开、气在身侧拢成将拍未拍的两道弧（`action.present`，可打断、不花 PP）。
 *   下（downstroke，提交后）：第一拍。俯冲式下施法者朝目标冲进 `swoop` 格；以真实斜翼棱柱罩住身前下方的扇面，
 *       命中者挨一记 `wing` 伤害；俯冲式是接触、悬停式是隔空风压（非接触）。
 *   上（upstroke）：`gap` 之后第二拍。俯冲式下施法者退回 `rise` 格，随后沿第一拍真实方向的反侧朝身后上方反拍；
 *       方向在提交时锁死，不因每拍重取瞄准而变向；走出斜翼扇面的人自然躲开。
 *   收（settle）：收翅的余风。
 *
 * 选取：`kind: "aim"`——方向或世界点都能拍，空放照常完成两拍；目标离开只是第一拍拍空，动作仍按两拍走完。
 *
 * 与同族分开：二连劈是站定垂直下砸、两刀同向；二连击是原地左右回扫；只有双翼是**掠飞式、施法者自身在俯冲与
 *   拉升之间移动、两翼前后反向的两拍**，反制方式是在两拍之间走出翼弧、或趁它俯冲贴近后反打。
 */
namespace PokemonSkills {
    /** 第二拍的水平准线：第一拍真实方向的水平反向；方向接近竖直时退化为世界 Z 轴。 */
    function dualwingbeatBack(heading: CombatPoint): CombatPoint {
        return WorldGeometry.flatUnit(WorldCombat.point(-heading.x(), 0, -heading.z()));
    }

    /**
     * 真实斜翼扇面：在「拍势水平方向 × 世界竖直」平面里张开 `span` 度的竖直翼弧，`lift`（弧度）把整条弧心压向
     * 身前下方或抬向身后上方；再沿水平侧向加厚成三维棱柱。判定用 `region`（bodyPrism 与真实实体箱求交），
     * 画面 `path` 就是同一组顶点——两拍各自前下/后上，不再退化成水平 sector，也不像倾斜平板那样钻到地下。
     */
    function dualwingbeatFan(origin: CombatPoint, heading: CombatPoint, lift: number, reach: number, spanDegrees: number, halfThickness: number): { region: WorldGeometry.BodyRegion; path: number[][] } {
        const forward = WorldGeometry.flatUnit(heading);
        const up = WorldCombat.point(0, 1, 0);
        const side = WorldCombat.point(-forward.z(), 0, forward.x());
        const span = Math.max(1, Math.min(179, spanDegrees));
        const centre = Math.max(-1.3, Math.min(1.3, lift));
        // 整条弧都留在该拍自己的一侧（前拍不在身后开扇、后拍不在身前开扇）。
        const half = Math.min(span * Math.PI / 360, Math.PI / 2 - Math.abs(centre) - 0.03);
        const samples = Math.max(2, Math.min(10, Math.round(span / 22)));
        const vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= samples; i++) {
            const angle = centre - half + 2 * half * (i / samples);
            const ray = forward.scale(Math.cos(angle)).plus(up.scale(Math.sin(angle)));
            vertices.push(origin.plus(ray.unit().scale(reach)));
        }
        const path: number[][] = [];
        for (let j = 0; j < vertices.length; j++) path.push([vertices[j].x(), vertices[j].y(), vertices[j].z()]);
        return { region: WorldGeometry.bodyPrism(vertices, side, Math.max(0.1, halfThickness)), path: path };
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
                radius: p("dualwingbeat", "reach", context), geometry: "cone", orientation: "aim",
                spread: p("dualwingbeat", "span", context), style: "wingbeat", color: 0xCFE7F2,
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
            // 提交那刻锁死整趟的翼平面：第一拍朝身前下方，第二拍沿同一方向的反侧朝身后上方，不再每拍重取瞄准。
            const locked = WorldGeometry.flatUnit(aim(action), action.direction());
            const back = dualwingbeatBack(locked);
            const riseDir = WorldCombat.point(back.x(), 0.4, back.z()).unit();
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
                // 俯冲式先在锁定平面内冲进、后退升；悬停式不动，只在原地拍出风压。
                if (dive && index === 0) {
                    const gapToTarget = Math.max(0, current.targetPosition().minus(before.position()).length() - 1.0);
                    // 前移走水平准线；下压的是翼锋（判定扇面），不是把身体扎进地面。
                    scope.displace(actor, locked.scale(Math.min(swoop, gapToTarget)));
                } else if (dive && index === 1) {
                    scope.displace(actor, riseDir.scale(rise));
                }
                const here = scope.observe(actor);
                const origin = here === null ? before.position() : here.position();
                // 第一拍向前下、第二拍从真实新身位向后上：竖直翼弧棱柱各自判定，判定与画面读同一组顶点。
                const heading = index === 0 ? locked : back;
                const lift = index === 0 ? -0.4 : 0.5;
                const fan = dualwingbeatFan(origin, heading, lift, reach, span, strokeRadius);
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                    { moment: index === 0 ? "downstroke" : "upstroke", index: index + 1, wings: 2, reach: reach, span: span,
                        radius: strokeRadius, feathers: feathers, dive: dive ? 1 : 0, contact: dive ? 1 : 0,
                        lift: lift, direction: [heading.x(), heading.y(), heading.z()], path: fan.path }, 22);
                let hits = 0;
                WorldGeometry.selectBodies(scope, fan.region, function (victim, facts) {
                    if (hits >= cap || facts.friendly() || String(victim.ref()) === String(actor.ref())) return;
                    // 真实墙面（clipBlocks 的 MISS 由 blockHit 过滤）挡住翼弧就打不到。
                    if (WorldGeometry.blockHit(scope, origin, scope.closestPoint(victim, origin)) !== null) return;
                    // 俯冲式贴脸的近翼是接触；悬停式隔空风压不接触。
                    if (!hurt(current, victim, dualwingbeatId, power, { damage: damageSpec(dualwingbeatId, "wing"), contact: dive })) return;
                    hits++;
                    const at = scope.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    // 被拍开沿拍势走原生受击位移；抗击退者由原生拒绝，不会被硬移。
                    if (scope.valid(victim)) scope.hitDisplace(victim, heading.scale(index === 0 ? push : push * 0.6));
                    WorldFeedback.emit(scope, dualwingbeatScene, 1, point,
                        { moment: index === 0 ? "strike1" : "strike2", target: String(victim.ref()), index: index + 1, feathers: feathers,
                            radius: strokeRadius, intensity: Math.max(0.5, Math.min(2, power / 55)), contact: dive ? 1 : 0 }, 22);
                    scope.sound("cobblemon:impact.flying", point, 14, "{}");
                });
                if (index === 0) {
                    if (hits === 0) WorldFeedback.emit(scope, dualwingbeatScene, 1, origin,
                        { moment: "miss1", direction: [heading.x(), heading.y(), heading.z()], reach: reach, span: span, feathers: feathers, path: fan.path }, 18);
                    current.after(gap, function (next: CombatAction) { beat(next, 1); });
                    return;
                }
                WorldFeedback.emit(scope, dualwingbeatScene, 1, origin.plus(heading.scale(reach * 0.5)),
                    { moment: "settle", reach: reach, span: span, feathers: feathers }, 18);
                finish(current);
            }

            sound(action, "cobblemon:animation.plumage.wing_flap.medium");
            if (dive) sound(action, "minecraft:entity.phantom.swoop");
            beat(action, 0);
        }
    });
}
