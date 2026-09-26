/**
 * 雪崩 / avalanche 的出手方式。
 *
 * 核心念头：施术者站定，把身前积雪倾倒成一整股宽而低的雪体，沿瞄准方向贴着真实地面向前塌滑；缓坡跟着滑下、
 *   实墙与明显上台阶把它挤住停下、悬崖处散落。带着一路挨打积起来的「被打懵」时这一记翻倍，积得越厚雪带越宽。
 *
 * 三幕：
 *   起（windup，提交前）：身前地面拢起一堆雪，雪屑向里收，积伤越厚堆头越大（present gather）。
 *   滑（execute）：从脚边起逐段采样真实地表，雪体沿地面推进；每一步把雪面带过的每个非友方只结算一次
 *       （中央满额、两侧边缘 0.7），并沿前进方向推开。撞墙挤住、坠崖散落，都不再原地圆爆。
 *   尾（settle）：滑过的最后一段在可替换自然地表上留下残雪；报出这一崩的结果。
 *
 * 与同族分开：冰冻之风是一堵直推的冷气锋，只按走廊扫过；滚动是自己缩成石球滚进去；岩崩是抛石头砸一片。
 *   雪崩是唯一受地形约束、会沿坡下滑、被墙截住的雪体。
 */
namespace PokemonSkills {
    /** 残雪：只租借滑过的最后一段所在、可替换的自然地表，换成一层存留 `ticks` 的积雪。 */
    function avalancheFrost(world: CombatWorld, trail: CombatPoint[], half: number, ticks: number): void {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const spread = Math.max(0, Math.min(2, Math.floor(half)));
        const from = Math.max(0, trail.length - 3);
        for (let index = from; index < trail.length; index++) {
            const at = trail[index], baseX = Math.floor(at.x()), baseZ = Math.floor(at.z());
            for (let dx = -spread; dx <= spread; dx++) for (let dz = -spread; dz <= spread; dz++) {
                if (dx * dx + dz * dz > spread * spread + 0.01) continue;
                const x = baseX + dx, z = baseZ + dz;
                const ground = avalancheGround(world, x, at.y() + 1, z);
                if (ground === null) continue;
                const gy = Math.floor(ground.y()) - 1;
                const key = x + "," + gy + "," + z;
                if (seen[key]) continue;
                if (!avalancheSurface(world.block(WorldCombat.point(x + 0.5, gy, z + 0.5)))) continue;
                seen[key] = true;
                cells.push({ x: x, y: gy, z: z, block: "minecraft:snow_block" });
            }
        }
        if (cells.length) world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks);
    }

    define({
        id: avalancheId,
        cooldownParameter: "recharge",
        name: "Avalanche",
        description: "站定把身前积雪倾倒成一股宽而低的雪体，沿瞄准方向贴着地面塌滑：缓坡跟着滑下、实墙把它挤住、悬崖处散落。雪面触及的非友方只受一次伤害（中央满额、两侧约 70%），并被向前推开；带着「被打懵」积伤时威力翻倍，积得越厚雪带越宽。滑过的最后一段在可替换自然地表上留下残雪。",
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
            const front = WorldGeometry.ground(world, feet.plus(heading.scale(0.9)), 3);
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
            const start = self !== null ? self.position() : action.origin();
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const reach = Math.max(2.4, p(avalancheId, "reach", action));
            const step = Math.max(0.45, Math.min(1.0, p(avalancheId, "step", action)));
            const half = Math.max(0.5, p(avalancheId, "radius", action));
            const push = p(avalancheId, "push", action);
            const power = p(avalancheId, "collapse", action);
            const shards = Math.round(p(avalancheId, "shards", action));
            const frostTicks = Math.max(40, Math.round(p(avalancheId, "frost", action)));
            const stacks = avalancheStacks(world, actor);
            const battered = stacks > 0;
            const scale = Math.max(0.45, Math.min(2.4, half / 1.0));
            const crest = WorldFeedback.actionScenes(avalancheScene);
            const hit: { [ref: string]: boolean } = {};
            const trail: CombatPoint[] = [];
            let travelled = 0, attempts = 0, touched = 0, settled = false;

            const base = self !== null
                ? WorldCombat.point(start.x(), start.y() - self.height() / 2, start.z())
                : action.origin();
            let front = WorldGeometry.ground(world, base.plus(heading.scale(0.6)), 3);
            trail.push(front);

            function pathAt(point: CombatPoint): number[][] {
                const left = point.plus(side.scale(half)), right = point.minus(side.scale(half));
                return [[left.x(), left.y(), left.z()], [right.x(), right.y(), right.z()]];
            }

            /** 从 from 到 to 的这条宽雪带里，每个尚未结算的非友方只伤一次；中央满额，两侧边缘 0.7。 */
            function touches(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                const scope = current.world();
                const corners = [from.plus(side.scale(half)), from.minus(side.scale(half)),
                    to.minus(side.scale(half)), to.plus(side.scale(half))];
                const lowY = Math.min(from.y(), to.y()) - 1.6, highY = Math.max(from.y(), to.y()) + 1.0;
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
                avalancheFrost(scope, trail, half, frostTicks);
                const lastAt = trail.length ? trail[trail.length - 1] : front;
                WorldFeedback.emit(scope, avalancheScene, 1, lastAt,
                    { moment: kind === "wall" ? "pile" : kind === "cliff" ? "fall" : "settle", width: half, shards: shards,
                        stacks: stacks, battered: battered ? 1 : 0, scale: scale }, 30);
                WorldFeedback.emit(scope, avalancheScene, 1, lastAt,
                    { moment: "frost", width: half, scale: scale, shards: Math.round(shards * 0.6), linger: frostTicks }, Math.min(WorldFeedback.maxTicks, frostTicks));
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
                const lip = front.plus(heading.scale(Math.min(stride, 0.5)));
                if (ahead === null) { touches(current, front, lip); finish(current, "cliff"); return; }
                const rise = ahead.y() - front.y();
                if (rise > 0.6) { touches(current, front, lip); finish(current, "wall"); return; }
                if (rise < -avalancheCliff) { front = ahead; trail.push(front); touches(current, lip, front.plus(heading.scale(0.4))); finish(current, "cliff"); return; }
                const previous = front;
                front = ahead;
                travelled += stride;
                trail.push(front);
                touches(current, previous, front);
                crest.show(current, "crest", front,
                    { moment: "front", path: pathAt(front), width: half, shards: shards, stacks: stacks, battered: battered ? 1 : 0,
                        scale: scale, progress: Math.min(1, travelled / reach) });
                scope.sound("minecraft:block.powder_snow.step", front, 12, "{}");
                if (travelled >= reach - 0.001) { finish(current, "reach"); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.powder_snow.place");
            crest.show(action, "crest", front,
                { moment: "front", path: pathAt(front), width: half, shards: shards, stacks: stacks, battered: battered ? 1 : 0, scale: scale, progress: 0 });
            advance(action);
        }
    });
}
