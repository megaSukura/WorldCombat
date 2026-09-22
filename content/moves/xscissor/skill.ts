/**
 * 十字剪 / xscissor 的出手方式。
 *
 * 核心念头：两把镰刀像剪刀一样一左一右地合拢——左刃先合、右刃后合，各自扫过身前一侧的半扇面，
 * 在中轴线上交叉成一个 X。站在中轴上的目标被两刃同时剪中、结算两次；偏到一侧只被一片刃扫到。
 * 所以它的形状是「把目标框在两刃之间」：完整剪断还是被蹭到，取决于站位。
 *
 * 幕：
 *   起（windup，提交后为 blade）：双臂先向两侧张开，左侧刃势先亮。
 *   合（blade 一次，提交后）：左刃扫过左半扇面，`gap` 刻后右刃扫过右半扇面；两侧都被扫到的目标
 *       第二次结算时吃 `sever` 加成，落点交叉闪出一个 X。
 *   空（miss）：两刃都没碰到人就只留一道空剪的风。
 *
 * 与同族分开：居合斩是一趟贴地的宽弧并割草，连斩是越接越多刀的攒节奏，劈开是慢而准的单点重劈；
 * 十字剪是唯一「两拍、两侧合拢、中轴吃两次」的交叉斩。
 */
namespace PokemonSkills {
    /** 把瞄准方向在水平面内旋转 degrees 度，得到一侧刃势的朝向。 */
    function xscissorDirection(direction: CombatPoint, degrees: number): CombatPoint {
        const base = Math.atan2(direction.x(), direction.z()), angle = base + degrees * Math.PI / 180;
        return WorldCombat.point(Math.sin(angle), 0, Math.cos(angle));
    }

    /** 一侧刃势的斜线：从身体该侧伸出，斜向落在合剪点上。 */
    function xscissorArm(origin: CombatPoint, direction: CombatPoint, reach: number, side: number, arm: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const start = origin.plus(lateral.scale(side * arm)).plus(WorldCombat.point(0, 0.2, 0));
        const end = origin.plus(heading.scale(reach));
        return [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]];
    }

    /** 合剪点上的一个 X：由两段斜线交叉组成。 */
    function xscissorCross(point: CombatPoint, direction: CombatPoint, half: number, vertical: number): CombatPoint[][] {
        const lateral = WorldCombat.point(-direction.z(), 0, direction.x());
        const up = WorldCombat.point(0, 1, 0);
        return [
            [point.plus(lateral.scale(-half)).plus(up.scale(-vertical)), point.plus(lateral.scale(half)).plus(up.scale(vertical))],
            [point.plus(lateral.scale(-half)).plus(up.scale(vertical)), point.plus(lateral.scale(half)).plus(up.scale(-vertical))]
        ];
    }

    define({
        id: xscissorId,
        name: "X-Scissor",
        description: "The user slashes at the target by crossing its scythes, claws, or the like as if they were a pair of scissors.",
        uses: ["两刃从左右合拢成一把剪刀", "把目标框在中轴上完整剪断", "两拍、两侧、中轴吃两次"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.1,
        prepare: 7,
        active: 22,
        recover: 7,
        cooldown: 26,
        style: "slash",
        defaults: { scissor: true, ai: { maxChase: 5, crowd: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(xscissorId, "reach", pokemon), geometry: "cone", style: "slash", color: 0xB6D45A,
                label: config && config.scissor === false ? "开剪" : "十字剪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[xscissorId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(xscissorId, "tempo", context)),
                recover: Math.round(p(xscissorId, "aftercast", context)),
                cooldown: Math.round(p(xscissorId, "recharge", context)),
                active: skills[xscissorId].active,
                range: p(xscissorId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_xscissor:windup", xscissorScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scissors: config && config.scissor !== false }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reach = p(xscissorId, "reach", action);
            const blade = p(xscissorId, "blade", action);
            const span = p(xscissorId, "span", action);
            const gap = Math.max(2, Math.round(p(xscissorId, "gap", action)));
            const sever = Math.max(0, p(xscissorId, "sever", action));
            const arm = p(xscissorId, "arm", action);
            const scale = Math.max(0.6, Math.min(2.0, arm / xscissorReference));
            const intensity = Math.max(0.6, Math.min(2.4, blade / 38));
            const crossHalf = Math.max(0.5, Math.min(1.2, reach * 0.35));
            const first: { [ref: string]: boolean } = Object.create(null);
            let total = 0, crossed = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (total === 0) {
                    const scope = current.world();
                    const body = scope.observe(current.actor());
                    const at = body !== null ? body.position() : current.origin();
                    WorldFeedback.emit(scope, xscissorScene, 1, at.plus(aim(current).scale(reach * 0.6)),
                        { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), xscissorMissText, [], 22);
                }
                done(current);
            }

            function swing(current: CombatAction, side: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const origin = body.position(), direction = aim(current);
                WorldFeedback.emit(scope, xscissorScene, 1, origin,
                    { moment: "blade", path: xscissorArm(origin, direction, reach, side, arm), side: side, span: span,
                        reach: reach, scale: scale, intensity: intensity }, 16);
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, xscissorDirection(direction, side * span / 4),
                        reach, span / 2 + 6, { below: 1.1, above: 2.2 }),
                    function (victim, facts) {
                        const ref = String(victim.ref()), second = side > 0 && first[ref] === true;
                        const power = second ? blade * (1 + sever) : blade;
                        if (!hurt(current, victim, xscissorId, power,
                            { damage: damageSpec(xscissorId, "blade"), contact: true, slice: true })) return;
                        total++;
                        WorldFeedback.emit(scope, xscissorScene, 1, facts.position(),
                            { moment: "clip", target: ref, side: side, power: power, second: second,
                                sparks: Math.max(4, Math.min(24, Math.round(power * 0.5))), scale: scale, intensity: intensity }, 16);
                        if (side < 0) { first[ref] = true; return; }
                        if (!second) return;
                        crossed++;
                        WorldFeedback.emit(scope, xscissorScene, 1, facts.position(),
                            { moment: "cross", target: ref, notes: Math.max(8, Math.round(power * 0.3)), scale: scale, intensity: intensity }, 20);
                        const cross = xscissorCross(facts.position(), direction, crossHalf, crossHalf * 0.9);
                        for (let index = 0; index < cross.length; index++)
                            WorldFeedback.emit(scope, xscissorScene, 1, facts.position(),
                                { moment: "cross", target: ref, scale: scale,
                                    path: [[cross[index][0].x(), cross[index][0].y(), cross[index][0].z()],
                                        [cross[index][1].x(), cross[index][1].y(), cross[index][1].z()]] }, 20);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), xscissorCrossText, [], 26);
                    });
                sound(current, "minecraft:item.trident.hit");
                if (side > 0) { finish(current); return; }
                current.after(gap, function (next: CombatAction) { swing(next, 1); });
            }

            sound(action, "cobblemon:impact.bug");
            swing(action, -1);
        }
    });
}
