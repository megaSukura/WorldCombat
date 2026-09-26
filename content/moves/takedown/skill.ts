/**
 * 猛撞 / takedown 的出手方式。
 *
 * 核心念头：最朴素的一次全力肩撞。缩肩低头，沿瞄准方向直线冲出一小段，用整个身体把目标顶开；
 * 撞实的一下反作用力会顺着肩膀回到自己身上。冲空只是滑停站定——没有任何花招，也不额外受伤。
 * 一句话：本族的基准线，谁都用得起的一记硬撞。
 *
 * 两幕：
 *   起（windup，提交前）：缩肩、蹬地，只播预告表现。
 *   撞（charge → impact / miss）：提交后逐刻沿瞄准方向推进；trace 撞上活体即按 ram 结算接触伤害、
 *       按 recoil 比例反伤自己（共享结算）、把目标顶开 shove 格，自己被后坐弹回 bounce 格；
 *       撞到底、撞墙或推不动都算冲空，滑停扬尘。
 *
 * 与同族分开：疯狂伏特带电并留下麻痹，地狱翻滚是抓住再摔，爆炸头突击撞得更长更重还能串人；
 * 猛撞最短、最便宜、没有额外结果，冲空完全安全。玩家凭「这一下干净利落、撞完只是后坐」把它认出来。
 * 配置 runup（助跑）由 resolve 改时序射程、由公式改威力与反作用力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const takedownScene = "world_combat:move_takedown";
    const takedownHitText = "world_combat.move.takedown.text.hit";
    const takedownMissText = "world_combat.move.takedown.text.miss";
    const takedownRecoilText = "world_combat.move.takedown.text.recoil";

    define({
        freeMovement: true,
        id: "takedown",
        cooldownParameter: "recharge",
        name: "Take Down",
        description: "最朴素的一次全力肩撞：缩肩低头冲出一小段，用整个身体把目标顶开；撞实的一下反作用力会伤到自己，冲空只是滑停站定。谁都用得起的一记硬撞。",
        uses: ["用一次便宜的肩撞顶开贴脸的对手", "在挨打前先手打断并拉出身位", "给残血目标补上最后一撞"],
        kind: "enemy",
        range: 3.7,
        maxRange: 6.9,
        prepare: 7,
        active: 26,
        recover: 9,
        cooldown: 30,
        style: "impact",
        defaults: { runup: 1, ai: { maxChase: 9, preferWeak: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("takedown", "radius", pokemon) * 1.7, geometry: "line", style: "impact", color: 0xC9B48A, label: "猛撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["takedown"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("takedown", "tempo", context)),
                recover: Math.round(p("takedown", "aftercast", context)),
                cooldown: Math.round(p("takedown", "recharge", context)),
                range: p("takedown", "dash", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_takedown:windup", takedownScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", runup: config && config.runup }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(takedownScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("takedown", "dash", action);
            const pace = p("takedown", "pace", action);
            const radius = p("takedown", "radius", action);
            const power = p("takedown", "ram", action);
            const recoil = p("takedown", "recoil", action);
            const shove = p("takedown", "shove", action);
            const bounce = p("takedown", "bounce", action);
            const dust = Math.round(p("takedown", "dust", action));
            const minimumMove = p("takedown", "minimumMove", action);
            const direction = aim(action);
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.2, power / 90));
            let travelled = 0;

            const start = action.origin();
            const end = start.plus(direction.scale(length));
            sound(action, "minecraft:entity.player.attack.strong");
            movementScenes.show(action, "charge", start, { moment: "charge", direction: [direction.x(), direction.y(), direction.z()],
                    path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    length: length, dust: dust, scale: scale, intensity: intensity });

            function miss(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, takedownScene, 1, body.position(), { moment: "miss", dust: dust, scale: scale }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), takedownMissText, [], 26);
                }
                sound(current, "minecraft:block.sand.break");
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { miss(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "takedown", power,
                        { damage: damageSpec("takedown", "ram"), contact: true, recoil: recoil });
                    WorldFeedback.emit(scope, takedownScene, 1, point,
                        { moment: "impact", target: victim ? String(victim.ref()) : "", dust: dust, scale: scale,
                            intensity: intensity, hits: Math.round(10 + dust * 0.6) }, 28);
                    sound(current, "cobblemon:impact.normal");
                    if (landed && victim !== null && scope.valid(victim)) {
                        scope.hitDisplace(victim, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), takedownHitText, [], 26);
                    }
                    // 反作用力由共享结算按 recoil 比例落在自己身上；这里只补后坐位移与表现。
                    scope.displace(actor, direction.scale(-bounce));
                    const self = scope.observe(actor);
                    if (self !== null) {
                        WorldFeedback.emit(scope, takedownScene, 1, self.position(),
                            { moment: "recoil", bounce: bounce, scale: scale, intensity: Math.max(0.5, Math.min(2.2, power * recoil / 45)) }, 24);
                        WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.3, 0)), takedownRecoilText, [], 24);
                    }
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { miss(current); return; }
                movementScenes.show(current, "wake", origin, { moment: "wake", dust: dust, scale: scale });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
