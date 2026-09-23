/**
 * 鬼火 / willowisp 的出手方式。
 *
 * 念头的形状：在身前一盏冷色的鬼火亮起（windup），随后这盏火自己扑向目标（travel）——它每刻只肯转有限的角度，
 * 目标跑得够快或绕到障碍后就能甩掉；追上的一刻把共享的灼伤身份按上去（burn），目标身上燃起冷焰。
 * 追丢了就地熄灭（fizzle）。两幕：windup → travel → burn / fizzle。
 * 灼伤身份是共享的 `world_combat:status/burn`；宝可梦那一层由共享默认效果同步成原生灼伤，
 * 火属性与相应特性由共享免疫窗口挡下。
 */
namespace PokemonSkills {
    const willowispScene = "world_combat:move_willowisp";
    const willowispBurnText = "world_combat.move.willowisp.text.burn";
    const willowispImmuneText = "world_combat.move.willowisp.text.immune";
    const willowispFizzleText = "world_combat.move.willowisp.text.fizzle";

    define({
        id: "willowisp",
        name: "Will-O-Wisp",
        description: "向射程内目标发射追踪鬼火，命中造成灼伤。",
        uses: ["隔开距离点着对手", "削弱靠物攻压上来的目标", "逼目标躲火而放弃站位"],
        kind: "enemy",
        range: 12,
        maxRange: 16,
        prepare: 10,
        active: 60,
        recover: 10,
        cooldown: 55,
        style: "ghostfire",
        defaults: { swift: false, ai: { maxChase: 14, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["willowisp"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("willowisp", "prepare", context),
                recover: p("willowisp", "recover", context),
                cooldown: p("willowisp", "cooldown", context),
                range: p("willowisp", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_willowisp:windup", willowispScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const speed = p("willowisp", "wispSpeed", action);
            const radius = p("willowisp", "wispRadius", action);
            const turn = p("willowisp", "wispTurn", action);
            const burnTicks = p("willowisp", "burnTicks", action);
            const range = action.range();
            const target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            sound(action, "cobblemon:move.willowisp.actor_1");
            const appearance: LivingActions.ProjectileAppearance = { sprite: "cobblemon:particle/generic/fire/wisp" };
            if (targetRef) appearance.homing = { target: targetRef, turn: turn, delay: 3, range: range };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: 240, appearance: appearance,
                impact: function (current, hit) {
                    const body = current.world();
                    const struck = hit.target();
                    if (struck === null || !body.valid(struck)) {
                        WorldFeedback.emit(body, willowispScene, 1, hit.position(), { moment: "fizzle" }, 20);
                        WorldFeedback.text(body, hit.position(), willowispFizzleText, [], 24);
                        sound(current, "minecraft:block.fire.extinguish");
                        return;
                    }
                    const point = hit.position(), ref = String(struck.ref());
                    if (CombatStatus.inflict(body, struck, "burn", burnTicks)) {
                        const count = Math.round(14 + burnTicks / 60);
                        WorldFeedback.emit(body, willowispScene, 1, point, { moment: "burn", target: ref,
                            count: count, size: 0.09 + count * 0.004, speed: 0.14 + count * 0.006 }, 34);
                        WorldFeedback.text(body, point, willowispBurnText, [], 30);
                        sound(current, "cobblemon:move.willowisp.target");
                    } else {
                        WorldFeedback.emit(body, willowispScene, 1, point, { moment: "immune", target: ref }, 22);
                        WorldFeedback.text(body, point, willowispImmuneText, [], 26);
                        sound(current, "minecraft:block.fire.extinguish");
                    }
                }
            }, done);
            action.present("willowisp:travel", willowispScene, 1, action.origin(), JSON.stringify({ moment: "travel",
                projectile: flight, target: targetRef, flow: Math.round(18 + speed * 16) }));
        }
    });
}
