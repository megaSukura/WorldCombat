/**
 * 十字劈 / crosschop 的出手方式。
 *
 * 核心念头：双手交叉举过头顶，两道劈击从相反斜上方先后落向面前挥击平面上的同一个点：第一劈撞开对手的架势，
 *   第二劈顺着同一个交叉点切下去。两劈隔 `gap` 刻先后结算，各自沿真实武器段做碰撞与墙裁剪；第二劈只对第一劈
 *   实际劈中的同一实体带破势加成——对手在第一劈之后侧移半步就只剩第一劈，换到旁人身上也没有加成。
 *
 * 两幕：
 *   起（windup，提交前）：双臂交叉举高，只播预告。
 *   劈（guard → seam → cross / wall / miss）：提交后锁定交叉点，第一劈落下（trace 真实武器段）；
 *       `gap` 刻后第二劈从另一侧落下，只有命中与第一劈相同的实体才按 (1 + seam) 放大；两劈都中同一实体才补 X。
 *
 * 与同族分开：十字剪是两把镰刀从左右合拢、扫过两片半扇面；劈瓦是贴地宽弧；上菜是不接触的窄走廊。
 * 十字劈是唯一「两劈先后从斜上方落在同一个锁定点上、第一劈替第二劈开门」的贴身双击。
 */
namespace PokemonSkills {
    /** 一道从施术者该侧肩上劈向交叉点的线：起于肩上（身体之外），落到锁定的交叉点。 */
    function crosschopSlash(grip: CombatPoint, center: CombatPoint, direction: CombatPoint, side: number, spread: number): number[][] {
        var lateral = WorldCombat.point(-direction.z(), 0, direction.x());
        var start = grip.plus(lateral.scale(side * spread * 0.6)).plus(WorldCombat.point(0, spread * 1.8, 0));
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

    /** 一段真实武器线的两个端点，供表现与判定读同一组位置。 */
    function crosschopSegment(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    define({
        id: crosschopId,
        cooldownParameter: "recharge",
        name: "Cross Chop",
        description: "双臂交叉举过头顶，两道劈击从相反斜上方先后落向面前同一个锁定交叉点：第一劈沿真实武器段把对手的架势撞开，第二劈顺着交叉点切下去；第二劈只对第一劈劈中的同一个敌人才切得更深，对手在间隔里侧移半步或换到旁人身上就只剩普通一劈。撞墙停在墙上，不会隔墙伤人。双劈式两劈等重、出手更快，但没有破势加成。",
        uses: ["用两次先后落下的交叉劈切开一个点", "第一劈撞开架势，第二劈切得更深", "在贴身距离结算两次接触伤害"],
        kind: "aim",
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
            return { radius: pokemon ? p(crosschopId, "reach", pokemon) : 2.4, geometry: "line", style: "cross",
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
            var gauge = Math.max(0.12, Math.min(0.4, spread * 0.3));
            var scale = Math.max(0.6, Math.min(2.0, spread / 0.6));
            var intensity = Math.max(0.6, Math.min(2.4, chop / 50));
            // 释放锁定面前挥击平面：选中实体就用它当刻的身体中心，否则取面前 reach 处的世界点。
            var heading = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            var selected = action.target();
            var at = centre.plus(heading.scale(reach));
            if (selected !== null && world.valid(selected)) {
                var selectedBody = world.observe(selected);
                if (selectedBody !== null) at = selectedBody.position();
            }
            action.data("world_combat:move_crosschop/point", JSON.stringify({ x: at.x(), y: at.y(), z: at.z() }));
            var firstRef = "", secondRef = "", settled = false;

            function wallSound(scope: CombatWorld, point: CombatPoint): void { scope.sound("minecraft:block.deepslate.break", point, 14, "{}"); }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var scope = current.world();
                if (firstRef === "" && secondRef === "") {
                    WorldFeedback.emit(scope, crosschopScene, 1, at, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), crosschopMissText, [], 22);
                }
                done(current);
            }

            function strike(current: CombatAction, isSecond: boolean): void {
                var scope = current.world();
                var slash = crosschopSlash(centre, at, heading, isSecond ? 1 : -1, spread);
                var start = WorldCombat.point(slash[0][0], slash[0][1], slash[0][2]);
                var end = WorldCombat.point(slash[1][0], slash[1][1], slash[1][2]);
                // 沿真实武器段做碰撞：先碰实体就命中，先碰墙就停在墙上。
                var contact = current.trace(start, end, gauge, true);
                var wallBlock = contact.blocked() && !contact.hitEntity();
                var victim = contact.hitEntity() ? contact.target() : null;
                if (victim !== null && (String(victim.ref()) === String(actor.ref()) || scope.friendly(victim))) victim = null;
                var stop = wallBlock ? (contact.blockPosition() || contact.position()) : end;
                WorldFeedback.emit(scope, crosschopScene, 1, stop,
                    { moment: isSecond ? "seam" : "guard", path: crosschopSegment(start, stop), side: isSecond ? 1 : -1,
                        target: victim === null ? "" : String(victim.ref()), spread: spread, scale: scale, intensity: intensity }, 16);
                if (wallBlock) {
                    WorldFeedback.emit(scope, crosschopScene, 1, stop, { moment: "wall", face: contact.blockFace(), scale: scale }, 18);
                    wallSound(scope, stop);
                } else if (victim !== null) {
                    var power = isSecond && firstRef !== "" && firstRef === String(victim.ref()) ? chop * (1 + seam) : chop;
                    if (hurt(current, victim, crosschopId, power, { damage: damageSpec(crosschopId, "chop"), contact: true })) {
                        if (isSecond) secondRef = String(victim.ref()); else firstRef = String(victim.ref());
                        var now = scope.observe(victim);
                        var point = now === null ? stop : now.position();
                        WorldFeedback.emit(scope, crosschopScene, 1, point,
                            { moment: "cut", target: String(victim.ref()), second: isSecond ? 1 : 0, power: power,
                                count: Math.round(8 + power * 0.3),
                                scale: scale, intensity: Math.max(0.5, Math.min(2.4, power / 50)) }, 18);
                        scope.sound("cobblemon:impact.fighting", point, 14, "{}");
                        if (!isSecond) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)), crosschopBreakText, [], 20);
                    }
                }
                if (!isSecond) { current.after(gap, function (next: CombatAction) { strike(next, true); }); return; }
                // 只有同一实体两劈都中才补完整 X 伤痕。
                if (firstRef !== "" && firstRef === secondRef) {
                    var cross = crosschopCross(at, heading, Math.max(0.45, Math.min(1.0, spread)));
                    for (var index = 0; index < cross.length; index++)
                        WorldFeedback.emit(scope, crosschopScene, 1, at, { moment: "cross", target: secondRef,
                            path: crosschopSegment(cross[index][0], cross[index][1]), scale: scale }, 20);
                    WorldFeedback.emit(scope, crosschopScene, 1, at,
                        { moment: "cross", target: secondRef, count: Math.round(10 + chop * 0.3), scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), crosschopCrossText, [], 24);
                }
                finish(current);
            }

            sound(action, "minecraft:entity.player.attack.strong");
            strike(action, false);
        }
    });
}
