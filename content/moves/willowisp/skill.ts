/**
 * 鬼火 / willowisp 的出手方式。
 *
 * 念头的形状：在身前一盏冷色的鬼火亮起（windup），随后这盏火自己扑向目标（travel）——它每刻只肯转有限的角度，
 * 目标跑得够快或绕到障碍后就能甩掉；追上的一刻把共享的灼伤身份按上去（burn），目标身上燃起冷焰。
 *
 * 目标输入是 aim：没锁定时朝瞄准方向直飞，不自动拐向谁；锁定一个**敌对**目标时才有有限的追踪（turn）。
 * 友好或未知关系的实体不会被自动追踪，只是炮弹朝它所在的位置直飞——这就是手动目标的自由度。
 * 撞到方块就停在表面熄灭（block），飞完或目标离场只在落点散掉（fizzle）。
 * 两幕：windup → travel → burn / immune / block / fizzle。
 * 灼伤身份是共享的 `world_combat:status/burn`；宝可梦那一层由共享默认效果同步成原生灼伤，
 * 火属性与相应特性由共享免疫窗口挡下。本招不造成任何直接伤害。
 */
namespace PokemonSkills {
    const willowispScene = "world_combat:move_willowisp";
    const willowispBurnText = "world_combat.move.willowisp.text.burn";
    const willowispImmuneText = "world_combat.move.willowisp.text.immune";
    const willowispFizzleText = "world_combat.move.willowisp.text.fizzle";

    define({
        id: "willowisp",
        name: "Will-O-Wisp",
        description: "朝瞄准方向放出一团冷色鬼火：选中敌人时会有限度地追它，空瞄或对着地点就直线飞行，撞到方块即熄灭。它本身不造成直接伤害，只施加灼伤——持续掉血并降低物理攻击伤害。鬼火转向有限，拉开距离或绕行可以避开。",
        uses: ["从远处使对手灼伤", "削弱靠物攻压上来的目标", "逼目标躲火而放弃站位"],
        kind: "aim",
        range: 12,
        maxRange: 16,
        prepare: 10,
        active: 60,
        recover: 10,
        cooldown: 55,
        style: "ghostfire",
        defaults: { swift: false, ai: { maxChase: 14, preferPhysical: true, leaveStation: true } },
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
            const world = action.world();
            const speed = p("willowisp", "wispSpeed", action);
            const radius = p("willowisp", "wispRadius", action);
            const turn = p("willowisp", "wispTurn", action);
            const burnTicks = p("willowisp", "burnTicks", action);
            const range = action.range();
            const selected = action.target();
            // 只有锁定的敌对实体才有限追踪；空瞄、友好与未知关系都保持瞄准方向直飞。
            let locked = "";
            if (selected !== null && world.valid(selected)) {
                const body = world.observe(selected);
                if (body !== null && body.hostile()) locked = String(selected.ref());
            }
            sound(action, "cobblemon:move.willowisp.actor_1");
            const appearance: LivingActions.ProjectileAppearance = { sprite: "cobblemon:particle/generic/fire/wisp" };
            if (locked !== "") appearance.homing = { target: locked, turn: turn, delay: 3, range: range };
            const scenes = WorldFeedback.actionScenes(willowispScene);
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: 240, appearance: appearance,
                impact: function (current, hit) {
                    const body = current.world();
                    scenes.stop(current, "travel");
                    const struck = hit.target();
                    if (struck !== null && body.valid(struck)) {
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
                        return;
                    }
                    // 撞到方块就在表面熄灭；飞完或目标离场只在落点散掉。
                    const wall = hit.blocked(), at = wall && hit.blockPosition() !== null ? hit.blockPosition()! : hit.position();
                    WorldFeedback.emit(body, willowispScene, 1, at, { moment: wall ? "block" : "fizzle" }, 20);
                    WorldFeedback.text(body, at, willowispFizzleText, [], 24);
                    sound(current, "minecraft:block.fire.extinguish");
                }
            }, function (current) { scenes.finish(current, done); });
            scenes.show(action, "travel", action.origin(), { moment: "travel",
                projectile: flight, target: locked, flow: Math.round(18 + speed * 16) });
        }
    });
}
