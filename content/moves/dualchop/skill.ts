/**
 * 二连劈 / dualchop —— 出手方式。
 *
 * 核心念头：一记**两道刀路**。第一刀沿提交时锁定的准线窄而重地竖劈下去，只取刀路上的第一个目标，墙会截停；
 *   第二刀隔 `gap` 刻，以第一刀的实际落点为圆心，横向展开一记又宽又短的横斩，扫过落点两侧。两刀形状不同、
 *   各自结算，第二刀不依赖第一刀命中来加成。
 *
 * 幕：
 *   起（raise，提交前）：前肢先竖举再横转、对准准线，只播预告（`action.present`，可打断、不花 PP）。
 *   一（chop1，提交后）：第一刀。沿准线逐刻推进一小段真实子段，每刻 `action.trace` 那一小段做权威首碰，
 *       最先碰到的实体或墙就是落点并立即停刀；判定与画面共用同一组端点。命中结算 `chop` 并把目标顶开；
 *       只有真正碰到身体或墙（支撑面）才在落点留一道短裂痕（只画线、不动方块），空劈不留。
 *   二（chop2）：以第一刀落点为圆心、`breadth` 半径、`span` 张角的宽短横斩；逐刻发当刻真实子弧，实墙
 *       截短、墙后的目标扫不到，最多 `maxTargets` 个，每个结算一次 `slash`；走出横斩范围的人自然躲开。
 *   收（settle）：收势的余震。
 *
 * 选取：`kind: "aim"`——方向或世界点都能锁准线，提交后可空劈；墙挡线不穿透，两刀之间走出横斩范围就能躲第二刀。
 *
 * 与同族分开：二连击是原地左右回扫、把人来回推；双翼是掠飞、有升力；双光束是两道远程眼束。只有二连劈是**站定、
 *   一竖一横两道刀路**，第二刀的横斩围绕第一刀的落点展开。
 */
namespace PokemonSkills {
    /** 第一刀留下的短视觉裂痕：从落点贴地起、沿准线的水平方向铺 `length` 格；只画线，不改动方块。 */
    function dualchopGroundPath(world: CombatWorld, landing: CombatPoint, length: number, flat: CombatPoint): number[][] {
        const dir = flat.length() < 0.001 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const start = WorldGeometry.ground(world, landing, 6);
        const samples = Math.max(2, Math.min(6, Math.round(length)));
        const path: number[][] = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const point = WorldCombat.point(start.x() + dir.x() * length * t, start.y() + 1, start.z() + dir.z() * length * t);
            const ground = WorldGeometry.ground(world, point, 4);
            path.push([ground.x(), ground.y() + 0.03, ground.z()]);
        }
        return path;
    }

    function dualchopNumbers(points: CombatPoint[]): number[][] {
        const values: number[][] = [];
        for (let i = 0; i < points.length; i++) values.push([points[i].x(), points[i].y(), points[i].z()]);
        return values;
    }

    define({
        id: dualchopId,
        cooldownParameter: "recharge",
        name: "Dual Chop",
        description: "抡起坚硬的前肢站定连劈两下：第一刀沿准线窄而重地竖劈，逐刻推进、只劈刀路上的第一个目标；第二刀以第一刀的落点为圆心横展开一记宽短横斩，逐刻扫过落点两侧，实墙挡住的扫不到。只有第一刀真正碰到身体或墙才留下一道短裂痕，空劈不留；裂痕只是视觉线，不改动方块。",
        uses: ["站定先竖劈准线，再横斩落点两侧", "第一刀窄而重，第二刀宽短照顾多个", "把身前一小片敌人用横斩一起劈到"],
        kind: "aim",
        range: 2.9,
        maxRange: 4.2,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "chop",
        defaults: { ai: { maxChase: 9, finishLow: false, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[dualchopId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dualchop", "tempo", context)),
                recover: Math.round(p("dualchop", "settle", context)),
                cooldown: Math.round(p("dualchop", "recharge", context)),
                active: 0,
                range: p("dualchop", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shards = Math.max(6, Math.round(p("dualchop", "shards", action)));
            action.present("dualchop:raise:" + action.id(), dualchopScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, shards: shards }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[dualchopId], detail: { values: config } };
            return { radius: p("dualchop", "reach", context), geometry: "cone", style: "chop", color: 0xC79BE8, label: "二连劈" };
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(dualchopScene);
            const world = action.world();
            const actor = action.actor();
            const selfRef = String(actor.ref());
            const chop = p("dualchop", "chop", action);
            const slash = p("dualchop", "slash", action);
            const gap = Math.max(2, Math.round(p("dualchop", "gap", action)));
            const reach = Math.max(2, action.range());
            const edge = p("dualchop", "edge", action);
            const breadth = p("dualchop", "breadth", action);
            const span = p("dualchop", "span", action);
            const push = p("dualchop", "push", action);
            const quake = p("dualchop", "quake", action);
            const crackTicks = Math.max(40, Math.round(p("dualchop", "crackTicks", action)));
            const shards = Math.max(8, Math.round(p("dualchop", "shards", action)));
            const cap = Math.max(1, Math.round(p("dualchop", "maxTargets", action)));
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const half = self === null ? 0.7 : self.height() / 2;
            const lift = Math.max(0, half - 0.2);
            // 朝向在提交时固定：整招只用这一次读到的准线与落点。
            const aimPoint = action.targetPosition();
            const delta = aimPoint.minus(origin.plus(WorldCombat.point(0, lift, 0)));
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const flat = WorldGeometry.flatUnit(direction, action.direction());
            const heading = [direction.x(), direction.y(), direction.z()];
            const scale = Math.max(0.6, Math.min(2, reach / 2.9));
            const intensity1 = Math.max(0.5, Math.min(2, chop / 55));
            const intensity2 = Math.max(0.5, Math.min(2, slash / 45));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 第二刀：以第一刀落点为圆心逐刻扫出的宽短横斩；判定与画面共用同一组子弧端点，实墙截短。 */
            function cross(current: CombatAction, landing: CombatPoint): void {
                const scope = current.world();
                const steps = Math.max(3, Math.min(8, Math.round(span / 30)));
                const halfAngle = Math.max(0.05, Math.min(Math.PI, span * Math.PI / 360));
                const base = Math.atan2(flat.x(), flat.z());
                const struck: { [ref: string]: boolean } = Object.create(null);
                let hits = 0;

                function bearing(t: number): number { return -halfAngle + 2 * halfAngle * t; }
                /** 子弧上的一点：沿朝向偏 `angle`、到 `breadth`，径向先撞上实墙就把端点截在真实墙面。 */
                function rim(angle: number): CombatPoint {
                    const headingPoint = WorldCombat.point(Math.sin(base + angle), 0, Math.cos(base + angle));
                    const probe = landing.plus(headingPoint.scale(breadth));
                    const wall = WorldGeometry.blockHit(scope, landing, probe);
                    const length = wall === null ? breadth : Math.max(0.15, wall.position().minus(landing).length());
                    return landing.plus(headingPoint.scale(length));
                }

                function step(current: CombatAction, index: number): void {
                    if (index >= steps) {
                        if (hits === 0)
                            WorldFeedback.emit(scope, dualchopScene, 1, landing,
                                { moment: "miss2", breadth: breadth, span: span, shards: shards }, 18);
                        WorldFeedback.emit(scope, dualchopScene, 1, landing,
                            { moment: "settle", breadth: breadth, span: span, shards: shards }, 18);
                        scenes.stop(current, "chop2");
                        finish(current);
                        return;
                    }
                    const a0 = bearing(index / steps), a1 = bearing((index + 1) / steps);
                    const rimPoints: CombatPoint[] = [landing];
                    for (let i = 0; i <= 3; i++) rimPoints.push(rim(a0 + (a1 - a0) * i / 3));
                    const tip = rimPoints[rimPoints.length - 1];
                    WorldGeometry.selectBodies(scope,
                        WorldGeometry.bodyPolygon(rimPoints, landing.y() - 1.6, landing.y() + 2.4),
                        function (victim, facts) {
                            const ref = String(victim.ref());
                            if (ref === selfRef || facts.friendly() || struck[ref] || hits >= cap) return;
                            // 实墙挡住的目标扫不到。
                            if (WorldGeometry.blockHit(scope, landing, facts.position()) !== null) return;
                            if (!hurt(current, victim, dualchopId, slash,
                                { segment: "slash", damage: damageSpec(dualchopId, "slash"), contact: true })) return;
                            struck[ref] = true;
                            hits++;
                            const body = scope.observe(victim);
                            const point = body === null ? facts.position() : body.position();
                            WorldFeedback.emit(scope, dualchopScene, 1, point,
                                { moment: "hit2", target: ref, shards: shards, intensity: intensity2 }, 22);
                            scope.sound("cobblemon:impact.dragon", point, 14, "{}");
                        });
                    scenes.show(current, "chop2", landing,
                        { moment: "chop2", path: dualchopNumbers(rimPoints), point: [tip.x(), tip.y(), tip.z()],
                            direction: heading, breadth: breadth, span: span, maxTargets: cap, shards: shards,
                            scale: scale, intensity: intensity2, progress: (index + 1) / steps });
                    current.after(1, function (next: CombatAction) { step(next, index + 1); });
                }

                step(current, 0);
            }

            /** 第一刀：沿准线逐刻推进的窄重竖劈；每小段做权威首碰，最先碰到的实体或墙立即停刀。 */
            function slashLine(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const base = body === null ? origin : body.position();
                const from = base.plus(WorldCombat.point(0, lift, 0));
                const to = from.plus(direction.scale(reach));
                const steps = Math.max(3, Math.min(6, Math.round(reach)));
                const points = WorldGeometry.along(from, to, reach / steps);

                function cleave(current: CombatAction, index: number): void {
                    const a = points[index], b = points[index + 1];
                    scenes.show(current, "chop1", base,
                        { moment: "chop1", path: [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()]],
                            direction: heading, reach: reach, edge: edge, shards: shards, scale: scale,
                            intensity: intensity1, progress: (index + 1) / steps });
                    const contact = current.trace(a, b, edge, true);
                    const supported = contact.hitEntity() || contact.blocked();
                    if (!supported && index + 2 < points.length) {
                        current.after(1, function (next: CombatAction) { cleave(next, index + 1); });
                        return;
                    }
                    conclude(current, contact, supported);
                }

                function conclude(current: CombatAction, contact: CombatImpact, supported: boolean): void {
                    const scope = current.world();
                    const at = contact.position();
                    const lander = contact.hitEntity() ? contact.target() : null;
                    const victim = lander !== null && String(lander.ref()) !== selfRef && !scope.friendly(lander) ? lander : null;
                    scenes.stop(current, "chop1");
                    if (victim !== null && scope.valid(victim)) {
                        const landed = impact(current, contact, dualchopId, chop,
                            { segment: "chop", damage: damageSpec(dualchopId, "chop"), contact: true });
                        if (landed) {
                            const body2 = scope.observe(victim);
                            const point = body2 === null ? at : body2.position();
                            if (flat.length() >= 0.001) scope.hitDisplace(victim, flat.unit().scale(push));
                            WorldFeedback.emit(scope, dualchopScene, 1, point,
                                { moment: "hit1", target: String(victim.ref()), shards: shards, intensity: intensity1 }, 22);
                            scope.sound("cobblemon:impact.dragon", point, 14, "{}");
                        } else {
                            WorldFeedback.emit(scope, dualchopScene, 1, at, { moment: "miss1", shards: shards, blocked: 0 }, 18);
                        }
                    } else {
                        WorldFeedback.emit(scope, dualchopScene, 1, at, { moment: "miss1", shards: shards, blocked: contact.blocked() ? 1 : 0 }, 18);
                    }
                    // 只有第一刀真正触到支撑面（身体或墙）才留短裂痕；空劈不找地。
                    if (supported) {
                        const crack = dualchopGroundPath(scope, at, quake, flat);
                        if (crack.length > 1)
                            WorldFeedback.emit(scope, dualchopScene, 1, at,
                                { moment: "crack", path: crack, quake: quake, crackTicks: crackTicks, shards: shards,
                                    scale: Math.max(0.6, Math.min(2, quake / 4)) },
                                Math.min(200, crackTicks));
                    }
                    current.after(gap, function (next: CombatAction) { cross(next, at); });
                }

                cleave(current, 0);
            }

            sound(action, "minecraft:entity.iron_golem.attack");
            slashLine(action);
        }
    });
}
