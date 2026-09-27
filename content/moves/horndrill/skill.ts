/**
 * 角钻 / horndrill 的出手方式。
 *
 * 核心念头：蹲身起旋，把身体拧成一支钻头，沿锁定的一条线高速钻出去——线路上第一个挡路的活体被钻尖贯穿、
 *   按本招预算结一次有限的重击。它比地裂更近、更快，但会位移、会撞墙：对手只要让开这条线，钻头就只能扎进地里。
 *
 * 两幕：
 *   起（windup，提交前）：角开始旋、脚下刮起一圈尘，只播预告，可被打断。
 *   钻（mark → bore → gore / miss，提交后）：锁定「自身→目标」的一条线并把它裁到最先撞到的墙面，蓄势 `mark`
 *       刻后沿这条线逐刻前进；撞上非友方活体就 `horndrillStrike` 结算一次，撞上墙或钻到尽头则停住、留下空响。
 *
 * 反制：让开这条直线、站到墙后，或换成幽灵属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: horndrillId,
        cooldownParameter: "recharge",
        name: "Horn Drill",
        description: "蹲身把角高速旋转成钻头，沿一条直线钻出去——线路上第一个挡路的活体被钻尖贯穿，按本招预算结一次有限的重击。它是这一族里唯一会位移的一记：让开这条线，或者躲到墙后，钻头就只能扎进地里。",
        uses: ["在近身对角线路上贯穿第一个挡路的目标", "逼对手横向让开，撞上墙就自己停住", "对手站桩时用一记重钻打出可观但有限的一击"],
        kind: "aim",
        range: 6,
        maxRange: 10,
        prepare: 14,
        active: 0,
        recover: 12,
        cooldown: 96,
        style: "drill",
        defaults: { wide: false, ai: { maxChase: 8 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[horndrillId], detail: { values: config } };
            return { radius: pokemon ? p(horndrillId, "span", context) : 6, geometry: "line", style: "ground",
                color: 0xC9A66B, label: config && config.wide === true ? "角钻·扩钻" : "角钻·细钻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[horndrillId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(horndrillId, "tempo", context)),
                recover: Math.round(p(horndrillId, "aftercast", context)),
                cooldown: Math.round(p(horndrillId, "recharge", context)),
                active: 0,
                range: p(horndrillId, "span", context) + 0.4
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_horndrill:windup", horndrillScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true,
                    windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(horndrillScene);
            const headScenes = WorldFeedback.actionScenes("world_combat:move_horndrill/drill");
            const world = action.world(), actor = action.actor(), target = action.target();
            const origin = action.origin(), direction = WorldGeometry.flatUnit(aim(action));
            const span = Math.max(4, p(horndrillId, "span", action));
            const girth = Math.max(0.45, p(horndrillId, "girth", action));
            const thrust = Math.max(0.4, p(horndrillId, "thrust", action));
            const mark = Math.max(8, Math.round(p(horndrillId, "mark", action)));
            const bore = Math.max(10, Math.round(p(horndrillId, "bore", action)));
            const scale = girth / horndrillReference;
            const end = origin.plus(direction.scale(span));
            // 预告钻路裁到最先撞到的真实墙面：墙前这一段才是要让开的位置。
            const wall = WorldGeometry.blockHit(world, origin, end);
            const reach = wall === null ? end : wall.position();
            // 唯一钻头贴本人实际前侧（沿真实朝向的一小段偏移），随本体移动。
            const front = direction.scale(Math.max(0.25, girth * 0.8));
            const frontOffset = [front.x(), 0.85, front.z()];
            let travelled = 0, settled = false;

            movementScenes.show(action, "mark", origin,
                { moment: "mark", target: target === null ? "" : String(target.ref()),
                    path: [[origin.x(), origin.y(), origin.z()], [reach.x(), reach.y(), reach.z()]],
                    span: span, girth: girth, bore: bore, scale: scale, front: frontOffset });
            headScenes.show(action, "head", origin, { actor: String(actor.ref()), direction: [direction.x(), 0, direction.z()], girth });
            sound(action, "minecraft:item.trident.riptide_1");

            function finish(current: CombatAction, result: string, at: CombatPoint, victimRef: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (result === "hit") {
                    WorldFeedback.emit(scope, horndrillScene, 1, at,
                        { moment: "gore", target: victimRef, bore: bore, scale: scale, kill: 0 }, 30);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), horndrillHitText, [], 28);
                    scope.sound("cobblemon:move.horndrill.target_1", at, 16, "{}");
                } else {
                    WorldFeedback.emit(scope, horndrillScene, 1, at, { moment: "miss", bore: bore, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)),
                        result === "resisted" || result === "immune" ? "world_combat.move.horndrill.text.resisted" : horndrillMissText, [], 22);
                    scope.sound("minecraft:block.stone.break", at, 12, "{}");
                }
                headScenes.stop(current);
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                movementScenes.stop(current, "mark");
                const scope = current.world(), from = current.origin();
                const remaining = span - travelled;
                if (remaining <= 0.001) { finish(current, "miss", from, ""); return; }
                const delta = direction.scale(Math.min(thrust, remaining));
                const swept = sweepStep(current, delta, girth), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const victimRef = String(victim.ref());
                        const result = horndrillStrike(current, victim);
                        if (result === "source-left") return;
                        finish(current, result, hit.position(), victimRef); return;
                    }
                }
                const moved = swept.moved;
                travelled += moved;
                movementScenes.show(current, "bore", from, { moment: "bore", target: target === null ? "" : String(target.ref()), bore: bore, scale: scale,
                        front: frontOffset, progress: Math.min(1, travelled / Math.max(0.001, span)) });
                if (hit.blocked() || moved < 0.03 || travelled >= span) { finish(current, "miss", scope.observe(actor) === null ? from : scope.observe(actor)!.position(), ""); return; }
                current.after(1, advance);
            }

            action.releaseTarget();
            action.after(mark, advance);
        }
    });
}
