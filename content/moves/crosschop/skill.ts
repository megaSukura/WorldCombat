/**
 * 十字劈 / crosschop 的出手方式。
 *
 * 核心念头：双手交叉举过头顶，两道劈击从相反斜上方落向同一点：第一劈撞开对手的架势，第二劈顺着同一个交叉点
 *   切下去。两劈隔 `gap` 刻先后结算，第二劈要在这个很短的射程里还在才落得下——原生的 80 命中就是这半步。
 *
 * 两幕：
 *   起（windup，提交前）：双臂交叉举高，只播预告。
 *   劈（guard → seam → cross / miss）：提交后第一劈落下（结算 chop，落点闪一下交叉的斜线）；`gap` 刻后第二劈落下，
 *       若第一劈得手则按 (1 + seam) 放大同一段；两劈都中，落点补一个 X 并浮字。两次都落空才收空劈。
 *
 * 与同族分开：十字剪是两把镰刀从左右合拢、扫过两片半扇面；劈瓦是贴地宽弧；上菜是不接触的窄走廊。
 * 十字劈是唯一「两劈先后从斜上方落在同一个点上、第一劈替第二劈开门」的贴身双击。
 */
namespace PokemonSkills {
    /** 一道斜上方劈入的线：从目标该侧上方起，落到目标身上。 */
    function crosschopSlash(center: CombatPoint, direction: CombatPoint, side: number, spread: number): number[][] {
        var lateral = WorldCombat.point(-direction.z(), 0, direction.x());
        var start = center.plus(lateral.scale(side * spread * 0.5)).plus(WorldCombat.point(0, spread * 2.2, 0))
            .plus(direction.scale(-spread * 0.6));
        return [[start.x(), start.y(), start.z()], [center.x(), center.y() + 0.4, center.z()]];
    }

    /** 落点上两道交叉的短线，组成一个 X。 */
    function crosschopCross(center: CombatPoint, direction: CombatPoint, half: number): CombatPoint[][] {
        var lateral = WorldCombat.point(-direction.z(), 0, direction.x()), up = WorldCombat.point(0, 1, 0);
        return [
            [center.plus(lateral.scale(-half)).plus(up.scale(half * 0.8)), center.plus(lateral.scale(half)).minus(up.scale(half * 0.8))],
            [center.plus(lateral.scale(-half)).minus(up.scale(half * 0.8)), center.plus(lateral.scale(half)).plus(up.scale(half * 0.8))]
        ];
    }

    define({
        id: crosschopId,
        name: "Cross Chop",
        description: "The user delivers a double chop with its forearms crossed.",
        uses: ["用两次先后落下的交叉劈切开一个点", "第一劈撞开架势，第二劈切得更深", "在贴身距离结算两次接触伤害"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.2,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "cross",
        defaults: { guard: true, ai: { maxChase: 5, pointBlank: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(crosschopId, "reach", pokemon) : 2.4, geometry: "cone", style: "cross",
                color: 0xD24B3E, label: config && config.guard === false ? "双劈式" : "破势式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[crosschopId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(crosschopId, "tempo", context)),
                recover: Math.round(p(crosschopId, "aftercast", context)),
                cooldown: Math.round(p(crosschopId, "recharge", context)),
                active: 0,
                range: p(crosschopId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(crosschopScene + ":windup", crosschopScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", guard: config && config.guard !== false ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            var centre = body === null ? action.origin() : body.position();
            var reach = Math.max(1.8, action.range());
            var chop = p(crosschopId, "chop", action);
            var seam = Math.max(0, p(crosschopId, "seam", action));
            var gap = Math.max(2, Math.round(p(crosschopId, "gap", action)));
            var spread = Math.max(0.35, p(crosschopId, "spread", action));
            var scale = Math.max(0.6, Math.min(2.0, spread / 0.6));
            var intensity = Math.max(0.6, Math.min(2.4, chop / 50));
            var first = false, second = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var scope = current.world();
                if (!first && !second) {
                    var here = scope.observe(current.actor());
                    var at = here === null ? centre : here.position().plus(aim(current).scale(reach * 0.6));
                    WorldFeedback.emit(scope, crosschopScene, 1, at, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), crosschopMissText, [], 22);
                }
                done(current);
            }

            function strike(current: CombatAction, isSecond: boolean): void {
                var scope = current.world();
                var here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                var origin = here.position(), direction = aim(current);
                var target = current.target();
                var at = origin.plus(direction.scale(reach));
                var targetBody = target !== null && scope.valid(target) ? scope.observe(target) : null;
                if (targetBody !== null) at = targetBody.position();
                var path = crosschopSlash(at, direction, isSecond ? 1 : -1, spread);
                WorldFeedback.emit(scope, crosschopScene, 1, at,
                    { moment: isSecond ? "seam" : "guard", path: path, side: isSecond ? 1 : -1, target: target === null ? "" : String(target.ref()),
                        spread: spread, scale: scale, intensity: intensity }, 16);
                if (target !== null && targetBody !== null && targetBody.position().minus(origin).length() <= reach + 0.7) {
                    var power = isSecond && first ? chop * (1 + seam) : chop;
                    if (hurt(current, target, crosschopId, power, { damage: damageSpec(crosschopId, "chop"), contact: true })) {
                        if (isSecond) second = true; else first = true;
                        var now = scope.observe(target);
                        var point = now === null ? at : now.position();
                        WorldFeedback.emit(scope, crosschopScene, 1, point,
                            { moment: "cut", target: String(target.ref()), second: isSecond ? 1 : 0, power: power,
                                count: Math.round(8 + power * 0.3),
                                scale: scale, intensity: Math.max(0.5, Math.min(2.4, power / 50)) }, 18);
                        world.sound("cobblemon:impact.fighting", point, 14, "{}");
                        if (!isSecond) {
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)), crosschopBreakText, [], 20);
                        }
                    }
                }
                if (!isSecond) { current.after(gap, function (next: CombatAction) { strike(next, true); }); return; }
                if (first && second) {
                    var cross = crosschopCross(at, direction, Math.max(0.45, Math.min(1.0, spread)));
                    for (var index = 0; index < cross.length; index++)
                        WorldFeedback.emit(scope, crosschopScene, 1, at, { moment: "cross", target: target === null ? "" : String(target.ref()),
                            path: [[cross[index][0].x(), cross[index][0].y(), cross[index][0].z()],
                                [cross[index][1].x(), cross[index][1].y(), cross[index][1].z()]], scale: scale }, 20);
                    WorldFeedback.emit(scope, crosschopScene, 1, at,
                        { moment: "cross", target: target === null ? "" : String(target.ref()), count: Math.round(10 + chop * 0.3), scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), crosschopCrossText, [], 24);
                }
                finish(current);
            }

            sound(action, "minecraft:entity.player.attack.strong");
            strike(action, false);
        }
    });
}
