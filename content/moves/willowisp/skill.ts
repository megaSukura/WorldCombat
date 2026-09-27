/**
 * 鬼火 / willowisp 的出手方式。
 *
 * 念头的形状：在身前一盏冷色的鬼火亮起（windup），随后这盏火自己扑向目标（travel）——它每刻只肯转有限的角度，
 * 目标跑得够快或绕到障碍后就能甩掉；追上的一刻把共享的灼伤身份按上去（burn），目标身上燃起冷焰。
 *
 * 目标输入是 aim：没锁定时朝瞄准方向直飞，不自动拐向谁；锁定一个**合法敌对战斗关系**（`world.friendly` 为假）的
 * 目标时才有有限的追踪（turn）——被激怒的普通生物与中立敌对都会锁定，而不再看实体的 hostile 分类。
 * 空瞄或非敌对目标只朝锁定位置直飞；撞到方块就停在接触面外侧熄灭（block），飞完或目标离场在实际终点散掉（fizzle）。
 * 撞到友方身体则明确截火、停在接触点，不走灼伤尝试、也不误播免疫。
 * 两幕：windup → travel → burn / immune / block / fizzle。
 * 灼伤身份是共享的 `world_combat:status/burn`；宝可梦那一层由共享默认效果同步成原生灼伤，
 * 火属性与相应特性由共享免疫窗口挡下。本招不造成任何直接伤害。
 */
namespace PokemonSkills {
    const willowispScene = "world_combat:move_willowisp";
    const willowispBurnText = "world_combat.move.willowisp.text.burn";
    const willowispImmuneText = "world_combat.move.willowisp.text.immune";
    const willowispFizzleText = "world_combat.move.willowisp.text.fizzle";

    /** 原生命中方块面的外法线；空 face 返回零向量（不偏移）。 */
    function willowispFaceNormal(face: string): CombatPoint {
        switch (face) {
            case "up": return WorldCombat.point(0, 1, 0);
            case "down": return WorldCombat.point(0, -1, 0);
            case "north": return WorldCombat.point(0, 0, -1);
            case "south": return WorldCombat.point(0, 0, 1);
            case "west": return WorldCombat.point(-1, 0, 0);
            case "east": return WorldCombat.point(1, 0, 0);
            default: return WorldCombat.point(0, 0, 0);
        }
    }

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
            // 锁定按合法敌对战斗关系（world.friendly），而不是实体的 hostile 分类：被激怒的普通生物、中立敌对也会被有限追踪；
            // 空瞄、友方与自选的非敌对方保持瞄准方向直飞。
            let locked = "";
            if (selected !== null && world.valid(selected) && !world.friendly(selected)) locked = String(selected.ref());
            sound(action, "cobblemon:move.willowisp.actor_1");
            const appearance: LivingActions.ProjectileAppearance = { sprite: "cobblemon:particle/generic/fire/wisp", hitAllies: true };
            if (locked !== "") appearance.homing = { target: locked, turn: turn, delay: 3, range: range };
            const scenes = WorldFeedback.actionScenes(willowispScene);
            let resolved = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: 240, appearance: appearance,
                impact: function (current, hit) {
                    const body = current.world();
                    scenes.stop(current, "travel");
                    resolved = true;
                    const struck = hit.target();
                    if (struck !== null && body.valid(struck)) {
                        const point = hit.position(), ref = String(struck.ref());
                        // 友方身体：明确截火、停在接触点，不走灼伤尝试、也不误播免疫。
                        if (body.friendly(struck)) {
                            WorldFeedback.emit(body, willowispScene, 1, point, { moment: "fizzle", target: ref }, 20);
                            WorldFeedback.text(body, point, willowispFizzleText, [], 24);
                            sound(current, "minecraft:block.fire.extinguish");
                            return;
                        }
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
                    // 撞到方块就在接触面外侧熄灭（用真实接触点，不用方块整数角）；飞完或目标离场只在实际落点散掉。
                    const wall = hit.blocked();
                    const at = wall ? hit.position().plus(willowispFaceNormal(hit.blockFace()).scale(0.06)) : hit.position();
                    WorldFeedback.emit(body, willowispScene, 1, at, { moment: wall ? "block" : "fizzle" }, 20);
                    WorldFeedback.text(body, at, willowispFizzleText, [], 24);
                    sound(current, "minecraft:block.fire.extinguish");
                }
            }, function (current) {
                // 未接触任何东西而到期：在 projectilePosition 读到的真实终点短熄，不在发射点或旧瞄准点假造终点。
                if (!resolved) {
                    const end = current.world().projectilePosition(flight);
                    if (end !== null) WorldFeedback.emit(current.world(), willowispScene, 1, end, { moment: "fizzle" }, 18);
                }
                scenes.finish(current, done);
            });
            scenes.show(action, "travel", action.origin(), { moment: "travel",
                projectile: flight, target: locked, flow: Math.round(18 + speed * 16) });
        }
    });
}
