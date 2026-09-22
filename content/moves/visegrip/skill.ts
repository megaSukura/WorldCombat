/**
 * 夹住 / visegrip 的出手方式。
 *
 * 核心念头：扑上一步，两只钳子从两侧同时合上夹住身边的目标碾一下，再顺势把它朝自己拽近。
 * 钳口相对目标越大，这一夹越实；目标越重越大，越夹不实、越拽不动。这是本组唯一会把目标拽近身的一招。
 *
 * 两幕（落空多一幕）：
 *   起（windup，提交前）：双钳张开、身体压低，只播预告。
 *   夹（lunge → clamp / miss，提交后）：朝目标补上一步，两钳一左一右合上；进入钳夹距离即结算 `squeeze` 接触伤害，
 *       命中后把目标朝自己拽近 `drag` 格（越重越拽不动）。目标被让开或擦身而过则落空。
 *
 * 与同为擒抱/控制的招分开：贝壳夹击是长时长碾磨、双方都被钉住；缠绕只压低速度与定身、伤害极低；
 * 夹住是一次干脆的双侧钳夹，伤害不低、把人拽近，不留持续状态。
 */
namespace PokemonSkills {
    const visegripScene = "world_combat:move_visegrip";
    const visegripHitText = "world_combat.move.visegrip.text.hit";
    const visegripMissText = "world_combat.move.visegrip.text.miss";

    define({
        id: "visegrip",
        name: "Vise Grip",
        description: "扑上一步，两只钳子从两侧同时合上夹住目标碾一下，再顺势把它朝自己拽近。钳口相对目标越大夹得越实；目标越重越大越夹不动、越拽不动。拖拽式把人拉得更近，代价是这一夹更轻；碾夹式相反。",
        uses: ["把逃跑的目标拽回近身", "对钳口相对更小的目标打一记实在的接触伤害", "把远处的敌人拖进队友的射程", "起手不长的一记贴身物理手段"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.0,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "pincer",
        defaults: { haul: false, ai: { maxChase: 6, opening: "anytime" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("visegrip", "reach", pokemon), geometry: "circle", style: "pincer",
                color: 0xE89080, label: config && config.haul === true ? "拖拽夹住" : "碾夹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["visegrip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("visegrip", "tempo", context)),
                recover: Math.round(p("visegrip", "aftercast", context)),
                cooldown: Math.round(p("visegrip", "recharge", context)),
                active: 0,
                range: p("visegrip", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_visegrip:open", visegripScene, 1, action.origin(),
                JSON.stringify({ moment: "open", scale: body ? (body.width() + body.height()) / 2.3 : 1, haul: !!(config && config.haul) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const target = action.target();
            const body = world.observe(self);
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            if (body === null || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, visegripScene, 1, body !== null ? body.position() : action.origin(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, (body !== null ? body.position() : action.origin()).plus(WorldCombat.point(0, 1.1, 0)), visegripMissText, [], 22);
                sound(action, "minecraft:block.piston.contract");
                done(action); return;
            }
            const victim = world.observe(target);
            if (victim === null) {
                WorldFeedback.emit(world, visegripScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), visegripMissText, [], 22);
                sound(action, "minecraft:block.piston.contract");
                done(action); return;
            }
            const reach = Math.max(1.8, p("visegrip", "reach", action));
            const lunge = Math.max(0, p("visegrip", "lunge", action));
            const power = p("visegrip", "squeeze", action);
            const drag = Math.max(0, p("visegrip", "drag", action));
            const motes = Math.max(10, Math.round(p("visegrip", "motes", action)));
            const from = body.position(), to = victim.position();
            const delta = to.minus(from), distance = delta.length();
            sound(action, "minecraft:block.piston.extend");
            if (distance > 0.7) {
                const step = Math.min(lunge, distance - 0.7);
                if (step > 0.05) world.displace(self, delta.unit().scale(step));
            }
            const settled = world.observe(self);
            const here = settled !== null ? settled.position() : from;
            const gap = here.minus(to).length();
            if (gap > reach + 0.25) {
                WorldFeedback.emit(world, visegripScene, 1, to, { moment: "miss", target: String(target.ref()), scale: scale }, 18);
                WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), visegripMissText, [], 22);
                done(action); return;
            }
            const landed = hurt(action, target, "visegrip", power, { damage: damageSpec("visegrip", "squeeze"), contact: true });
            if (!landed) {
                WorldFeedback.emit(world, visegripScene, 1, to, { moment: "miss", target: String(target.ref()), scale: scale }, 18);
                done(action); return;
            }
            WorldFeedback.emit(world, visegripScene, 1, to,
                { moment: "clamp", target: String(target.ref()), motes: motes, drag: drag, scale: scale,
                    intensity: Math.max(0.5, Math.min(2.0, power / 42)) }, 26);
            world.sound("cobblemon:impact.normal", to, 16, "{}");
            if (world.valid(target)) {
                const pull = to.minus(here);
                const length = pull.length();
                if (length > 0.7) {
                    const toward = pull.unit().scale(-Math.min(drag, length - 0.7));
                    if (toward.length() > 0.02) world.displace(target, toward);
                }
            }
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), visegripHitText, [Math.round(drag * 10) / 10], 24);
            done(action);
        }
    });
}
