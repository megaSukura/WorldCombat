/**
 * 二连劈 / dualchop —— 出手方式。
 *
 * 核心念头：一记**两道刀路**。第一刀沿提交时锁定的准线窄而重地竖劈下去，只取刀路上的第一个目标，墙会截停；
 *   第一刀砸地留下一条（纯视觉的）裂痕。第二刀隔 `gap` 刻，以第一刀的实际落点为圆心，横向展开一记又宽又短的
 *   横斩，扫过落点两侧。两刀形状不同、各自结算，第二刀不依赖第一刀命中来加成。
 *
 * 幕：
 *   起（raise，提交前）：前肢先竖举再横转、对准准线，只播预告（`action.present`，可打断、不花 PP）。
 *   一（chop1，提交后）：第一刀。沿准线 `action.trace` 一条 `edge` 半宽的刀路，只碰刀路上的第一个非友方；
 *       命中结算 `chop` 并把目标顶开；随后沿第一刀实际触地点画出一道 `quake` 格长的裂痕（只画线、不动方块）。
 *   二（chop2）：以第一刀落点为圆心、`breadth` 半径、`span` 张角的宽短横斩，扫过落点两侧，最多 `maxTargets` 个，
 *       每个结算一次 `slash`；走出横斩范围的人自然躲开。
 *   收（settle）：收势的余震。
 *
 * 选取：`kind: "aim"`——方向或世界点都能锁准线，提交后可空劈；墙挡线不穿透，两刀之间走出横斩范围就能躲第二刀。
 *
 * 与同族分开：二连击是原地左右回扫、把人来回推；双翼是掠飞、有升力；双光束是两道远程眼束。只有二连劈是**站定、
 *   一竖一横两道刀路**，第二刀的横斩围绕第一刀的落点展开。
 */
namespace PokemonSkills {
    /** 第一刀实际触地的视觉裂痕：沿 origin→landing 的水平线采样、吸附到地面；只画线，不改动方块。 */
    function dualchopGroundPath(world: CombatWorld, origin: CombatPoint, landing: CombatPoint, length: number): number[][] {
        const delta = WorldCombat.point(landing.x() - origin.x(), 0, landing.z() - origin.z());
        const distance = delta.length();
        const heading = distance < 0.01 ? WorldCombat.point(0, 0, 1) : delta.unit();
        const span = Math.max(1, Math.min(length, distance > 0.01 ? distance : length));
        const probeY = Math.max(origin.y(), landing.y()) + 2;
        const points = WorldGeometry.along(WorldCombat.point(origin.x(), 0, origin.z()),
            WorldCombat.point(origin.x() + heading.x() * span, 0, origin.z() + heading.z() * span), 1.0);
        const path: number[][] = [];
        for (let i = 0; i < points.length; i++) {
            const ground = WorldGeometry.ground(world, WorldCombat.point(points[i].x(), probeY, points[i].z()), 6);
            path.push([ground.x(), ground.y() + 0.03, ground.z()]);
        }
        return path;
    }

    define({
        id: dualchopId,
        cooldownParameter: "recharge",
        name: "Dual Chop",
        description: "抡起坚硬的前肢站定连劈两下：第一刀沿准线窄而重地竖劈，只劈刀路上的第一个目标；第二刀以第一刀的落点为圆心横展开一记宽短横斩，扫过落点两侧。裂痕只是第一刀实际触地的视觉线，不改动方块。",
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
            const world = action.world();
            const actor = action.actor();
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
            const heading = [direction.x(), direction.y(), direction.z()];
            const scale = Math.max(0.6, Math.min(2, reach / 2.9));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 第二刀：以第一刀落点为圆心的宽短横斩，扫过落点两侧。 */
            function cross(current: CombatAction, landing: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, dualchopScene, 1, landing,
                    { moment: "chop2", direction: heading, breadth: breadth, span: span, maxTargets: cap, shards: shards,
                        scale: scale, intensity: Math.max(0.5, Math.min(2, slash / 45)) }, 24);
                const intensity = Math.max(0.5, Math.min(2, slash / 45));
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(landing, direction, breadth, span, { below: 1.6, above: 2.4 }),
                    function (victim, facts) {
                        if (hits >= cap) return;
                        if (!hurt(current, victim, dualchopId, slash, { segment: "slash", damage: damageSpec(dualchopId, "slash"), contact: true })) return;
                        hits++;
                        const at = scope.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        WorldFeedback.emit(scope, dualchopScene, 1, point,
                            { moment: "hit2", target: String(victim.ref()), shards: shards, intensity: intensity }, 22);
                        scope.sound("cobblemon:impact.dragon", point, 14, "{}");
                    });
                if (hits === 0)
                    WorldFeedback.emit(scope, dualchopScene, 1, landing, { moment: "miss2", breadth: breadth, span: span, shards: shards }, 18);
                WorldFeedback.emit(scope, dualchopScene, 1, landing,
                    { moment: "settle", breadth: breadth, span: span, shards: shards }, 18);
                finish(current);
            }

            /** 第一刀：沿准线的窄重竖劈，只取刀路第一接触。 */
            function slashLine(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const base = body === null ? origin : body.position();
                const from = base.plus(WorldCombat.point(0, lift, 0));
                const to = from.plus(direction.scale(reach));
                const contact = current.trace(from, to, edge, true);
                const at = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !scope.friendly(lander) ? lander : null;
                const blade = [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]];
                WorldFeedback.emit(scope, dualchopScene, 1, base,
                    { moment: "chop1", path: blade, direction: heading, reach: reach, edge: edge, shards: shards,
                        scale: scale, intensity: Math.max(0.5, Math.min(2, chop / 55)) }, 22);
                if (victim !== null && scope.valid(victim)) {
                    const landed = impact(current, contact, dualchopId, chop, { segment: "chop", damage: damageSpec(dualchopId, "chop"), contact: true });
                    if (landed) {
                        const body2 = scope.observe(victim);
                        const point = body2 === null ? at : body2.position();
                        const flat = WorldCombat.point(direction.x(), 0, direction.z());
                        if (flat.length() >= 0.001) scope.hitDisplace(victim, flat.unit().scale(push));
                        WorldFeedback.emit(scope, dualchopScene, 1, point,
                            { moment: "hit1", target: String(victim.ref()), shards: shards, intensity: Math.max(0.5, Math.min(2, chop / 55)) }, 22);
                        scope.sound("cobblemon:impact.dragon", point, 14, "{}");
                    } else {
                        WorldFeedback.emit(scope, dualchopScene, 1, at, { moment: "miss1", shards: shards, blocked: 0 }, 18);
                    }
                } else {
                    WorldFeedback.emit(scope, dualchopScene, 1, at, { moment: "miss1", shards: shards, blocked: contact.blocked() ? 1 : 0 }, 18);
                }
                // 裂痕是纯视觉线：沿第一刀实际触地点吸附到地面铺开，不改动任何方块。
                const crack = dualchopGroundPath(scope, base, at, quake);
                if (crack.length > 1)
                    WorldFeedback.emit(scope, dualchopScene, 1, base,
                        { moment: "crack", path: crack, quake: quake, shards: shards, scale: Math.max(0.6, Math.min(2, quake / 4)) }, Math.min(200, crackTicks));
                current.after(gap, function (next: CombatAction) { cross(next, at); });
            }

            sound(action, "minecraft:entity.iron_golem.attack");
            slashLine(action);
        }
    });
}
