/**
 * 广域破坏 / breakingswipe 的出手方式。
 *
 * 核心念头：身子不动，甩起坚韧的尾巴从一侧扫向另一侧，沿身体实际高度扫出一道宽弧。尾巴扫到谁，谁才挨这一下：
 *   各被掀开、各降一级攻击；降攻真的落下才算数。它是本组唯一一次能同时压低多人的一记，单体最轻。
 *
 * 两幕（提交前只播预告）：
 *   起（coil，提交前）：重心压低、尾巴在身后摆开，只播一记预告。
 *   扫（sweep → hit / miss，提交后）：以自身为心、朝瞄准方向撑起张角 `arc`、半径 `radius` 的扇形，在若干刻里
 *       从 `−arc/2` 扫到 `+arc/2`；每一刻只结算**尾巴刚扫过的那一窄条**里的敌人，判定用身体实际上下边界的
 *       `bodyPolygon`，表现用同一段角片撑起的竖直尾带；各挨一记 `sweep` 接触伤害、沿离心方向被掀开 `push` 格、
 *       攻击下降 `stages` 级（按实际降下的级数反馈）。不做地形改动。
 *
 * 选择是自由的：`kind: "aim"` 收任意阵营实体或一个世界点；没有实体目标时用选中的点／方向确定扇形朝向，
 *   空扫不改变地形、只收势。伤害被拒绝时不掀开、不降攻。
 *
 * 与同族分开：猛扑是向前把自己送出去重撞一个，热带踢是低平的侧踢，bittermalice 隔空放怨念；广域破坏是
 *   **原地扫一片**。降攻对所有战斗者同一条路（NativeEffects.boost）。
 *
 * 配置 `wide` 由公式改张角／半径／威力与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const breakingswipeScene = "world_combat:move_breakingswipe";
    /** 真实尾尖与短尾线由自定义场景按当刻角片绘制（与判定同源）。 */
    const breakingswipeTailScene = "world_combat:move_breakingswipe_tail";
    const breakingswipeDropText = "world_combat.move.breakingswipe.text.drop";
    const breakingswipeHitText = "world_combat.move.breakingswipe.text.hit";
    const breakingswipeMissText = "world_combat.move.breakingswipe.text.miss";

    function breakingswipeHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 刚扫过的一窄条弧带的外弧（在高度 y 上）；表现与判定读同一段角度。 */
    function breakingswipeArc(centre: CombatPoint, radius: number, base: number, fromAngle: number, toAngle: number, y: number): CombatPoint[] {
        const spread = Math.abs(toAngle - fromAngle), samples = Math.max(1, Math.ceil(spread / (Math.PI / 12)));
        const points: CombatPoint[] = [];
        for (let i = 0; i <= samples; i++) {
            const angle = base + fromAngle + (toAngle - fromAngle) * (i / samples);
            points.push(WorldCombat.point(centre.x() + Math.cos(angle) * radius, y, centre.z() + Math.sin(angle) * radius));
        }
        return points;
    }

    /** 判定用脚底轮廓：心点 + 外弧的 x/z；高度带在 bodyPolygon 里由身体实际上下边界给出。 */
    function breakingswipeFootprint(centre: CombatPoint, arc: CombatPoint[]): CombatPoint[] {
        return [WorldCombat.point(centre.x(), centre.y(), centre.z())].concat(arc);
    }

    /** 表现用竖直尾带：底弧 + 顶弧围成的闭合面，读得出尾巴在身体实际高度上的厚度。 */
    function breakingswipeRibbon(centre: CombatPoint, arc: CombatPoint[], minY: number, maxY: number): number[][] {
        const path: number[][] = [[centre.x(), minY, centre.z()]];
        for (let i = 0; i < arc.length; i++) path.push([arc[i].x(), minY, arc[i].z()]);
        for (let i = arc.length - 1; i >= 0; i--) path.push([arc[i].x(), maxY, arc[i].z()]);
        path.push([centre.x(), maxY, centre.z()]);
        return path;
    }

    /** 目标相对朝向的带符号方位角（弧度）；正负各代表扫弧的一侧。 */
    function breakingswipeBearing(centre: CombatPoint, heading: CombatPoint, point: CombatPoint): number {
        const dx = point.x() - centre.x(), dz = point.z() - centre.z();
        return Math.atan2(heading.x() * dz - heading.z() * dx, heading.x() * dx + heading.z() * dz);
    }

    define({
        id: "breakingswipe",
        cooldownParameter: "recharge",
        name: "Breaking Swipe",
        description: "身子不动，甩起坚韧的尾巴从一侧扫向另一侧、沿身体实际高度扫过一道宽弧：尾巴扫到的敌人各挨一记接触伤害、被掀开，并让它们的攻击下降一级；只有真被压低的才按实际级数反馈。广域式罩得更宽，聚扫式打得更重。",
        uses: ["一次压低围在身边的一群敌人", "把贴身的敌人一起掀开、拉开距离", "趁敌人扎堆时一记压低多个物理输出"],
        kind: "aim",
        range: 3.0,
        maxRange: 5.8,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sweep",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 8, cluster: true } },
        fields: [flag("wide", "广域式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("breakingswipe", "radius", pokemon) : 3.0, geometry: "cone", style: "sweep", color: 0x8A6CFF,
                label: config && config.wide === true ? "广域破坏·广域式" : "广域破坏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["breakingswipe"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("breakingswipe", "tempo", context)),
                recover: Math.round(p("breakingswipe", "recover", context)),
                cooldown: Math.round(p("breakingswipe", "recharge", context)),
                active: 0,
                range: p("breakingswipe", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_breakingswipe:coil", breakingswipeScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            action.releaseTarget();
            const scenes = WorldFeedback.actionScenes(breakingswipeScene);
            const tails = WorldFeedback.actionScenes(breakingswipeTailScene);
            let centre = body.position(), minY = body.boundsMin().y(), maxY = body.boundsMax().y();
            const heading = breakingswipeHeading(aim(action));
            const radius = Math.max(2.0, p("breakingswipe", "radius", action));
            const arc = Math.max(80, Math.min(320, p("breakingswipe", "arc", action)));
            const power = p("breakingswipe", "sweep", action);
            const push = Math.max(0.1, p("breakingswipe", "push", action));
            const stages = Math.max(1, Math.round(p("breakingswipe", "stages", action)));
            const scales = Math.max(10, Math.round(p("breakingswipe", "scales", action)));
            const cap = Math.max(1, Math.round(p("breakingswipe", "maxTargets", action)));
            const wide = !!(config && config.wide === true);
            const scale = Math.max(0.6, Math.min(2.2, radius / 3.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 58));
            const half = arc * Math.PI / 360;
            const steps = Math.max(4, Math.min(12, Math.round(arc / 22)));
            const struck: { [ref: string]: boolean } = Object.create(null);
            const base = Math.atan2(heading.z(), heading.x());
            let hits = 0, dropped = 0, step = 0;

            sound(action, "cobblemon:move.dragonclaw.actor");
            world.sound("minecraft:player.attack.sweep", centre, 18, "{}");

            function resolve(current: CombatAction, enemy: CombatActor): void {
                const scope = current.world();
                const before = scope.observe(enemy);
                if (before === null) return;
                const at = before.position();
                if (!hurt(current, enemy, "breakingswipe", power, { damage: damageSpec("breakingswipe", "sweep"), contact: true })) return;
                hits++;
                const away = at.minus(centre);
                if (scope.valid(enemy) && Math.abs(away.x()) + Math.abs(away.z()) > 0.2)
                    scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                const lowered = scope.valid(enemy) ? -NativeEffects.boost(scope, enemy, "atk", -stages) : 0;
                if (lowered > 0) dropped++;
                // 命中即回执（含击杀）：降攻成功才压光；位置取自命中前，目标被击杀也照样发。
                WorldFeedback.emit(scope, breakingswipeScene, 1, at,
                    { moment: "hit", target: String(enemy.ref()), scales: scales, stages: stages, drop: lowered > 0 ? 1 : 0,
                        scale: scale, intensity: intensity }, 30);
            }

            function wrap(current: CombatAction): void {
                const scope = current.world();
                tails.stop(current);
                if (hits === 0) {
                    WorldFeedback.emit(scope, breakingswipeScene, 1, centre.plus(WorldCombat.point(0, 0.9, 0)),
                        { moment: "miss", scales: scales, scale: scale, intensity: intensity }, 24);
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.5, 0)), breakingswipeMissText, [], 26);
                } else if (dropped > 0) {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.5, 0)), breakingswipeDropText, [dropped], 26);
                } else {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.5, 0)), breakingswipeHitText, [hits], 26);
                }
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), actual = scope.observe(actor);
                if (actual === null) { tails.stop(current); scenes.finish(current, done); return; }
                centre = actual.position();
                minY = actual.boundsMin().y();
                maxY = actual.boundsMax().y();
                const fromAngle = -half + (step / steps) * (2 * half);
                const toAngle = -half + ((step + 1) / steps) * (2 * half);
                step++;
                const midY = (minY + maxY) / 2;
                const arcPoints = breakingswipeArc(centre, radius, base, fromAngle, toAngle, midY);
                const tip = arcPoints[arcPoints.length - 1];
                const footprint = breakingswipeFootprint(centre, arcPoints);
                const ribbon = breakingswipeRibbon(centre, arcPoints, minY, maxY);
                scenes.show(current, "sweep", centre,
                    { moment: "sweep", direction: [Math.cos(base + toAngle), 0, Math.sin(base + toAngle)], radius: radius, arc: arc,
                        scale: scale, scales: scales, path: ribbon, point: [tip.x(), tip.y(), tip.z()], wide: wide ? 1 : 0, intensity: intensity });
                // 真实尾尖与短尾线：与服务端同一段角片，撑出身体实际高度。
                tails.show(current, "tail", centre,
                    { moment: "tail", centre: [centre.x(), midY, centre.z()], point: [tip.x(), tip.y(), tip.z()],
                        minY: minY, maxY: maxY, radius: radius, scale: scale, intensity: intensity });
                WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(footprint, minY, maxY), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (hits >= cap || struck[ref] || facts.friendly() || ref === String(actor.ref())) return;
                    const point = scope.closestPoint(enemy, centre);
                    if (point === null || !scope.clear(centre, point)) return;
                    struck[ref] = true;
                    resolve(current, enemy);
                });
                if (step >= steps) { wrap(current); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
