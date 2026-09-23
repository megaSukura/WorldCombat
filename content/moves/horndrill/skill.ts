/**
 * 角钻 / horndrill 的出手方式。
 *
 * 核心念头：蹲身起旋，把身体拧成一支钻头，沿锁定的一条线高速钻出去——线路上第一个挡路的活体被钻尖贯穿、
 *   一次结清。它比地裂更近、更快，但会位移、会撞墙：对手只要让开这条线，钻头就只能扎进地里。
 *
 * 两幕：
 *   起（windup，提交前）：角开始旋、脚下刮起一圈尘，只播预告，可被打断。
 *   钻（mark → bore → gore / miss，提交后）：锁定「自身→目标」的一条线并画出钻路，蓄势 `mark` 刻后
 *       沿这条线逐刻前进；撞上非友方活体就 `horndrillExecute` 一次结清，撞上墙或钻到尽头则停住、留下空响。
 *
 * 反制：让开这条直线、站到墙后，或换成幽灵属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    define({
        id: horndrillId,
        cooldownParameter: "recharge",
        name: "Horn Drill",
        description: "The user stabs the target with a horn that rotates like a drill. The target faints instantly if this attack hits.",
        uses: ["在近身对角线路上贯穿一个目标", "逼对手横向让开，撞上墙就自己停住", "对手站桩时用一记钻穿终结它"],
        kind: "enemy",
        range: 6,
        maxRange: 10,
        prepare: 14,
        active: 0,
        recover: 12,
        cooldown: 96,
        style: "drill",
        defaults: { wide: false, ai: { maxChase: 8, executionAbove: 0.2 } },
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
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.3) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_horndrill:windup", horndrillScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const origin = action.origin(), direction = aim(action);
            const span = Math.max(4, p(horndrillId, "span", action));
            const girth = Math.max(0.45, p(horndrillId, "girth", action));
            const thrust = Math.max(0.4, p(horndrillId, "thrust", action));
            const mark = Math.max(8, Math.round(p(horndrillId, "mark", action)));
            const bore = Math.max(10, Math.round(p(horndrillId, "bore", action)));
            const scale = girth / horndrillReference;
            const targetRef = target === null ? "" : String(target.ref());
            const end = origin.plus(direction.scale(span));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, horndrillScene, 1, end,
                { moment: "mark", target: targetRef, path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]],
                    span: span, girth: girth, bore: bore, scale: scale }, mark + 24);
            sound(action, "minecraft:item.trident.riptide_1");

            function finish(current: CombatAction, result: string, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (result === "kill") {
                    WorldFeedback.emit(scope, horndrillScene, 1, at,
                        { moment: "gore", target: targetRef, bore: bore, scale: scale }, 30);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), horndrillKillText, [], 28);
                    scope.sound("cobblemon:move.horndrill.target_1", at, 16, "{}");
                    scope.sound("minecraft:item.trident.hit", at, 14, "{}");
                } else {
                    WorldFeedback.emit(scope, horndrillScene, 1, at, { moment: "miss", bore: bore, scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), horndrillMissText, [], 22);
                    scope.sound("minecraft:block.stone.break", at, 12, "{}");
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), from = current.origin();
                const remaining = span - travelled;
                if (remaining <= 0.001) { finish(current, "miss", from); return; }
                const delta = direction.scale(Math.min(thrust, remaining));
                const hit = current.trace(from, from.plus(delta.scale(1.3)), girth);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const result = horndrillExecute(current, victim);
                        if (result !== "miss") { finish(current, result, hit.position()); return; }
                    }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                WorldFeedback.keep(scope, "horndrill:spin:" + current.id(), horndrillScene, 1, from,
                    { moment: "bore", target: targetRef, bore: bore, scale: scale,
                        progress: Math.min(1, travelled / Math.max(0.001, span)) }, 6);
                if (hit.blocked() || moved < 0.03 || travelled >= span) { finish(current, "miss", scope.observe(actor) === null ? from : scope.observe(actor)!.position()); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
