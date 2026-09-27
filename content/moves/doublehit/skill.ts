/**
 * 二连击 / doublehit —— 出手方式。
 *
 * 核心念头：一记**尾巴拖过身前的来回两扫**。尾巴从身前扇面的一侧甩到另一侧，把扫过的对手沿切向拨开；
 *   紧接着原路反向回扫，把还在弧里的人再拨回来。两扫各自罩住整片身前扇面、方向相反，所以被扫到的人先被
 *   推到一边、又被推回。回扫式就是这条一来一回的弧；直扫式两扫同向、扇面更窄、每扫更重，沿同一个方向一路
 *   把人推出去。两扫各自在提交后重新读一次准心（每扫重新瞄准），第一扫后走位的人可能躲开回扫。
 *
 * 幕：
 *   起（raise，提交前）：转身把尾巴甩起来、地面上扬起一圈预备的尘土（`action.present`，可打断、不花 PP）。
 *   一（sweep1，提交后）：第一扫。尾尖按当刻真实子弧从扇面一侧推进到另一侧；只结算这一小段子弧真正扫到的
 *       非友方，每扫至多 `maxTargets` 个、各自 `swing` 接触伤害并沿扫动方向推开 `push` 格；实心墙挡住的
 *       目标扫不到。判定与画面共用同一组子弧端点。
 *   二（sweep2）：`gap` 之后第二扫。回扫式反走同一条弧、把目标沿反方向推回；直扫式同向再扫一遍、沿准线
 *       继续前推。第一扫命中过的人在这扫被标记为"回扫回头"，浮字提示。走出弧面的人躲开。
 *   收（settle）：收尾的余尘。
 *
 * 选取：`kind: "aim"`——方向或世界点都能挥尾，也能空扫；提交与执行都不要求存在敌人，`target` 为 null 时按
 *   `aim(action)` 读到的世界点/方向挥出两扫。
 *
 * 与同族分开：水流尾是一片向前压的弧形水墙、湿身、沿背离方向推走；铁尾锁定一点重砸；只有二连击是**原地
 *   左-右来回两扫**，把人沿弧线来回推，不带任何属性；反制方式是卡在两扫之间的空当、或绕到扫不到的背面。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：尾巴扫动的左右方向；方向接近竖直时退化为世界 X 轴。 */
    function doublehitSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    /** 子弧上的一点：沿朝向偏 `angle`、到 `reach`，若径向先撞上实心墙就把尾尖截在真实墙面。判定与表现共用。 */
    function doublehitRim(world: CombatWorld, origin: CombatPoint, base: number, angle: number, reach: number): CombatPoint {
        const heading = WorldCombat.point(Math.sin(base + angle), 0, Math.cos(base + angle));
        const probe = origin.plus(heading.scale(reach));
        const wall = WorldGeometry.blockHit(world, origin, probe);
        const length = wall === null ? reach : Math.max(0.2, wall.position().minus(origin).length());
        return origin.plus(heading.scale(length));
    }

    function doublehitNumbers(points: CombatPoint[]): number[][] {
        const values: number[][] = [];
        for (let i = 0; i < points.length; i++) values.push([points[i].x(), points[i].y(), points[i].z()]);
        return values;
    }

    define({
        id: doublehitId,
        cooldownParameter: "recharge",
        name: "Double Hit",
        description: "原地甩尾，尾巴拖过身前扇面来回两扫：尾尖按当刻真实子弧推进，第一扫把目标沿弧线扫开，第二扫回拍把人推回来。回扫式两扫方向相反、罩得更宽、推力更大、能同时照顾多个目标；直扫式两扫同向、更窄更集中、每扫更重，沿同一个方向一路把人推出去。实心墙挡住的目标扫不到。",
        uses: ["原地甩尾，向左右各扫一次", "把身前一小片敌人沿弧线来回推", "用宽弧的势把贴身的对手扫开"],
        kind: "aim",
        range: 3.4,
        maxRange: 4.8,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sweep",
        defaults: { arc: true, ai: { maxChase: 9, crowd: true, leaveStation: true } },
        fields: [flag("arc", "回扫")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[doublehitId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("doublehit", "tempo", context)),
                recover: Math.round(p("doublehit", "settle", context)),
                cooldown: Math.round(p("doublehit", "recharge", context)),
                active: 0,
                range: p("doublehit", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const dust = Math.max(6, Math.round(p("doublehit", "dust", action)));
            action.present("doublehit:raise:" + action.id(), doublehitScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, dust: dust, arc: config && config.arc === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[doublehitId], detail: { values: config } };
            return {
                radius: p("doublehit", "reach", context), geometry: "cone", style: "sweep", color: 0xD8C9A6,
                label: config && config.arc === true ? "二连击·回扫" : "二连击·直扫"
            };
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(doublehitScene);
            const actor = action.actor();
            const selfRef = String(actor.ref());
            const arc = !!(config && config.arc === true);
            const power = p("doublehit", "swing", action);
            const gap = Math.max(2, Math.round(p("doublehit", "gap", action)));
            const reach = Math.max(2, action.range());
            const span = p("doublehit", "span", action);
            const push = p("doublehit", "push", action);
            const dust = Math.max(8, Math.round(p("doublehit", "dust", action)));
            const cap = Math.max(1, Math.round(p("doublehit", "maxTargets", action)));
            const half = Math.max(0.1, Math.min(1.92, span * Math.PI / 360));
            // 每扫推进几小段：由扫过张角派生，不另存常数。子段越少越急。
            const steps = Math.max(3, Math.min(8, Math.round(span / 30)));
            const intensity = Math.max(0.5, Math.min(2, power / 50));
            const struck: { [ref: string]: boolean } = {};
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 一次完整扫：尾尖从扇面一侧推进到另一侧，每小段判定 + 上传当刻真实子弧。 */
            function sweep(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { sweep(next, 1); });
                    return;
                }
                const origin = self.position();
                // 每扫重新瞄准：第二扫读当前准心，第一扫后移位的人可能走出回程。
                const direction = WorldGeometry.flatUnit(aim(current), action.direction());
                const side = doublehitSide(direction);
                const base = Math.atan2(direction.x(), direction.z());
                // 回扫式第一扫朝一侧、回扫朝另一侧；直扫式两扫同向、沿准线前推。
                const forward = index === 0 || !arc;
                const shove = arc ? side.scale(index === 0 ? push : -push) : direction.scale(push);
                const hitSweep: { [ref: string]: boolean } = {};
                let hits = 0;

                function bearing(t: number): number { return forward ? half - 2 * half * t : -half + 2 * half * t; }

                function step(current: CombatAction, at: number): void {
                    if (at >= steps) {
                        if (index === 0) {
                            scenes.stop(current, "sweep1");
                            if (hits === 0) WorldFeedback.emit(scope, doublehitScene, 1, origin,
                                { moment: "miss1", direction: [direction.x(), direction.y(), direction.z()], reach: reach,
                                    fan: span, dust: dust }, 18);
                            current.after(gap, function (next: CombatAction) { sweep(next, 1); });
                            return;
                        }
                        WorldFeedback.emit(scope, doublehitScene, 1, origin.plus(direction.scale(reach * 0.5)),
                            { moment: "settle", reach: reach, arc: span, dust: dust }, 18);
                        finish(current);
                        return;
                    }
                    const a0 = bearing(at / steps), a1 = bearing((at + 1) / steps);
                    // 本小段的真实楔形：origin 加两侧与中间若干截断点；判定与画面共用。
                    const rim: CombatPoint[] = [origin];
                    for (let i = 0; i <= 3; i++) rim.push(doublehitRim(scope, origin, base, a0 + (a1 - a0) * i / 3, reach));
                    const path = doublehitNumbers(rim);
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodyPolygon(rim, origin.y() - 1.1, origin.y() + 2.4),
                        function (victim, facts) {
                            const ref = String(victim.ref());
                            if (ref === selfRef || facts.friendly() || hitSweep[ref] || hits >= cap) return;
                            // 实心墙挡住的目标扫不到。
                            if (WorldGeometry.blockHit(scope, origin, facts.position()) !== null) return;
                            if (!hurt(current, victim, doublehitId, power, { damage: damageSpec(doublehitId, "swing"), contact: true })) return;
                            hitSweep[ref] = true;
                            hits++;
                            const returned = index === 1 && struck[ref] === true;
                            if (index === 0) struck[ref] = true;
                            // 受击位移走原生受击入口：Boss 等抗推目标照常吃伤害但不被硬移。
                            if (scope.valid(victim)) scope.hitDisplace(victim, shove);
                            const body = scope.observe(victim);
                            const point = body === null ? facts.position() : body.position();
                            WorldFeedback.emit(scope, doublehitScene, 1, point,
                                { moment: index === 0 ? "hit1" : "hit2", target: ref, dust: dust, index: index + 1,
                                    arc: arc ? 1 : 0, side: index === 0 ? 1 : -1, intensity: intensity }, 22);
                            scope.sound("cobblemon:impact.normal", point, 14, "{}");
                            if (returned)
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), doublehitTurnText, [], 20);
                        });
                    scenes.show(current, index === 0 ? "sweep1" : "sweep2", origin,
                        { moment: index === 0 ? "sweep1" : "sweep2", index: index + 1, path: path,
                            tip: path[path.length - 1], direction: [direction.x(), direction.y(), direction.z()],
                            reach: reach, dust: dust, arc: arc ? 1 : 0, side: forward ? 1 : -1,
                            progress: (at + 1) / steps, intensity: intensity });
                    current.after(1, function (next: CombatAction) { step(next, at + 1); });
                }

                step(current, 0);
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            sweep(action, 0);
        }
    });
}
