/**
 * 雪崩 / avalanche 的出手方式。
 *
 * 核心念头：施术者站定，把身前积雪倾倒成一整股宽而低的雪体，沿瞄准方向贴着真实碰撞顶面向前塌滑；缓坡跟着滑下、
 *   实墙与明显上台阶把它挤住停下、悬崖只在崖口散落。带着一路挨打积起来的「被打懵」时这一记翻倍，积得越厚雪带越宽。
 *
 * 三幕：
 *   起（windup，提交前）：身前地面拢起一堆雪，雪屑向里收，积伤越厚堆头越大（present gather）。
 *   滑（execute）：从脚边起逐段用共享 SurfacePaths 的原生顶面采样（blockFace 朝上）真实地表，雪体沿地面推进；
 *       每一步把雪面带过的每个非友方只结算一次（中央满额、两侧边缘 0.7），并沿前进方向推开。撞墙挤住、崖口散落，
 *       都不再原地圆爆，也不会瞬跳到底再打一次。雪带两侧被真实墙面裁到墙前，判定层不过厚伤到下层。
 *   尾（settle）：滑过的最后一段只留一小段短时残雪粒子，不替换任何方块；报出这一崩的结果。
 *
 * 与同族分开：冰冻之风是一堵直推的冷气锋，只按走廊扫过；滚动是自己缩成石球滚进去；岩崩是抛石头砸一片。
 *   雪崩是唯一受地形约束、会沿坡下滑、被墙截住的雪体。
 */
namespace PokemonSkills {
    define({
        id: avalancheId,
        cooldownParameter: "recharge",
        name: "Avalanche",
        description: "站定把身前积雪倾倒成一股宽而低的雪体，沿瞄准方向贴着真实地面塌滑：缓坡跟着滑下、实墙把它挤住、悬崖处只在崖口散落。雪面触及的非友方只受一次伤害（中央满额、两侧约 70%），并被向前推开；带着「被打懵」积伤时威力翻倍，积得越厚雪带越宽。滑过的最后一段只留下短时残雪粒子。",
        uses: ["顺着下坡或平地推出一整片雪压制一排敌人", "挨了一轮打之后用翻倍的一发崩过去", "在墙前或台阶下把追兵挤住并推开"],
        kind: "aim",
        range: 3.2,
        maxRange: 5.4,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "ice",
        defaults: { deepdrift: false, ai: { maxChase: 9, crumble: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(avalancheId, "reach", pokemon) : 2.8, geometry: "line", style: "ice", color: 0x6FC4E8,
                label: config && config.deepdrift === true ? "雪崩·厚重" : "雪崩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[avalancheId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(avalancheId, "brace", context)),
                recover: Math.round(p(avalancheId, "settle", context)),
                cooldown: Math.round(p(avalancheId, "recharge", context)),
                active: 0,
                range: p(avalancheId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const stacks = world.valid(actor) ? avalancheStacks(world, actor) : 0;
            const shards = Math.round(p(avalancheId, "shards", action));
            const self = world.observe(actor);
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const feet = self !== null
                ? WorldCombat.point(self.position().x(), self.position().y() - self.height() / 2, self.position().z())
                : action.origin();
            const probe = WorldCombat.point(feet.x() + heading.x() * 0.9, feet.y(), feet.z() + heading.z() * 0.9);
            const front = avalancheGround(world, probe.x(), feet.y(), probe.z()) || WorldCombat.point(probe.x(), feet.y(), probe.z());
            action.present("avalanche:gather", avalancheScene, 1, front,
                JSON.stringify({ moment: "gather", stacks: stacks, battered: stacks > 0 ? 1 : 0,
                    shards: shards + stacks * 2, deepdrift: config && config.deepdrift === true, windup: prepare,
                    heading: [heading.x(), heading.y(), heading.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const start = self.position();
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const reach = Math.max(2.4, p(avalancheId, "reach", action));
            const step = Math.max(0.45, Math.min(1.0, p(avalancheId, "step", action)));
            const half = Math.max(0.5, p(avalancheId, "radius", action));
            const push = p(avalancheId, "push", action);
            const power = p(avalancheId, "collapse", action);
            const shards = Math.round(p(avalancheId, "shards", action));
            const stacks = avalancheStacks(world, actor);
            const battered = stacks > 0;
            const scale = Math.max(0.45, Math.min(2.4, half / 1.0));
            const crest = WorldFeedback.actionScenes(avalancheScene);
            const hit: { [ref: string]: boolean } = {};
            const trail: CombatPoint[] = [];
            let travelled = 0, attempts = 0, touched = 0, settled = false;

            const base = WorldCombat.point(start.x(), start.y() - self.height() / 2, start.z());
            const startProbe = WorldCombat.point(base.x() + heading.x() * 0.6, base.y(), base.z() + heading.z() * 0.6);
            let front = avalancheGround(world, startProbe.x(), base.y(), startProbe.z())
                || WorldCombat.point(startProbe.x(), base.y(), startProbe.z());
            trail.push(front);

            /** 当前雪带两侧被真实墙面裁出的净空半宽：墙在雪带内就只铺到墙前，不穿侧墙。 */
            function halfAt(point: CombatPoint): { left: number; right: number } {
                const probe = WorldCombat.point(point.x(), point.y() + 0.3, point.z());
                const leftHit = WorldGeometry.blockHit(world, probe, probe.plus(side.scale(half)));
                const rightHit = WorldGeometry.blockHit(world, probe, probe.minus(side.scale(half)));
                function reachOf(value: CombatImpact | null): number {
                    return value === null ? half : Math.max(0.1, value.position().minus(probe).length());
                }
                return { left: reachOf(leftHit), right: reachOf(rightHit) };
            }

            function pathAt(point: CombatPoint, widths: { left: number; right: number }): number[][] {
                const left = point.plus(side.scale(widths.left)), right = point.minus(side.scale(widths.right));
                return [[left.x(), left.y(), left.z()], [right.x(), right.y(), right.z()]];
            }

            /** 从 from 到 to 的这条宽雪带里，每个尚未结算的非友方只伤一次；中央满额，两侧边缘 0.7。 */
            function touches(current: CombatAction, from: CombatPoint, to: CombatPoint,
                fromW: { left: number; right: number }, toW: { left: number; right: number }): void {
                const scope = current.world();
                const corners = [from.plus(side.scale(fromW.left)), from.minus(side.scale(fromW.right)),
                    to.minus(side.scale(toW.right)), to.plus(side.scale(toW.left))];
                const lowY = Math.min(from.y(), to.y()) - 0.35, highY = Math.max(from.y(), to.y()) + 0.9;
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(corners, lowY, highY), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (hit[ref] || scope.friendly(enemy)) return;
                    const centre = facts.position();
                    const lateral = Math.abs(WorldGeometry.dot(WorldCombat.point(centre.x() - to.x(), 0, centre.z() - to.z()), side));
                    const factor = lateral > half * 0.5 ? 0.7 : 1.0;
                    if (!hurt(current, enemy, avalancheId, power * factor, { damage: damageSpec(avalancheId, "collapse"), contact: true })) return;
                    hit[ref] = true; touched++;
                    const away = WorldCombat.point(centre.x() - from.x(), 0, centre.z() - from.z());
                    const pushed = away.length() > 0.05 ? WorldCombat.point(away.x(), 0, away.z()).unit() : heading;
                    scope.hitDisplace(enemy, pushed.scale(push * factor));
                    WorldFeedback.emit(scope, avalancheScene, 1, centre,
                        { moment: "burst", target: ref, shards: Math.round(shards * factor), stacks: stacks, battered: battered ? 1 : 0,
                            power: Math.round(power * factor * 10) / 10, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power * factor / 70)) }, 26);
                });
            }

            function finish(current: CombatAction, kind: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                crest.stop(current, "crest");
                const lastAt = trail.length ? trail[trail.length - 1] : front;
                WorldFeedback.emit(scope, avalancheScene, 1, lastAt,
                    { moment: kind === "wall" ? "pile" : kind === "cliff" ? "fall" : "settle", width: half, shards: shards,
                        stacks: stacks, battered: battered ? 1 : 0, scale: scale }, 30);
                // 残雪只是短时粒子，不替换任何方块；按实际滑过的最后一段收尾。
                WorldFeedback.emit(scope, avalancheScene, 1, lastAt,
                    { moment: "frost", width: half, scale: scale, shards: Math.round(shards * 0.6) }, 30);
                scope.sound(kind === "wall" ? "minecraft:block.powder_snow.break" : kind === "cliff" ? "minecraft:block.snow.fall" : "cobblemon:impact.ice",
                    lastAt, 16, "{}");
                WorldFeedback.text(scope, lastAt.plus(WorldCombat.point(0, 1.15, 0)),
                    touched > 0 ? (battered ? avalancheCrashText : avalancheHitText) : avalancheMissText, [], 26);
                crest.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                if (travelled >= reach - 0.001 || ++attempts > 400) { finish(current, "reach"); return; }
                const stride = Math.min(step, reach - travelled);
                const nx = front.x() + heading.x() * stride, nz = front.z() + heading.z() * stride;
                const ahead = avalancheGround(scope, nx, front.y(), nz);
                const lip = WorldCombat.point(front.x() + heading.x() * Math.min(stride, 0.5), front.y(), front.z() + heading.z() * Math.min(stride, 0.5));
                const frontW = halfAt(front), lipW = halfAt(lip);
                if (ahead === null) {
                    // 探不到连续顶面：以横向碰撞面区分上台阶/墙与悬崖，雪体停在原地，不瞬跳到底。
                    const wall = SurfacePaths.support(scope, WorldCombat.point(nx, front.y(), nz), avalancheDrop, 0.6);
                    touches(current, front, lip, frontW, lipW);
                    finish(current, wall !== null ? "wall" : "cliff");
                    return;
                }
                const rise = ahead.y() - front.y();
                if (rise > 0.6) { touches(current, front, lip, frontW, lipW); finish(current, "wall"); return; }
                if (rise < -avalancheCliff) { touches(current, front, lip, frontW, lipW); finish(current, "cliff"); return; }
                const previous = front, previousW = frontW;
                front = ahead;
                const nextW = halfAt(front);
                travelled += stride;
                trail.push(front);
                touches(current, previous, front, previousW, nextW);
                crest.show(current, "crest", front,
                    { moment: "front", path: pathAt(front, nextW), width: half, shards: shards, stacks: stacks, battered: battered ? 1 : 0,
                        scale: scale, progress: Math.min(1, travelled / reach) });
                scope.sound("minecraft:block.powder_snow.step", front, 12, "{}");
                if (travelled >= reach - 0.001) { finish(current, "reach"); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.powder_snow.place");
            const startW = halfAt(front);
            crest.show(action, "crest", front,
                { moment: "front", path: pathAt(front, startW), width: half, shards: shards, stacks: stacks, battered: battered ? 1 : 0, scale: scale, progress: 0 });
            advance(action);
        }
    });
}
