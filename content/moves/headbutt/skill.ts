/**
 * 头锤 / headbutt 的出手方式。
 *
 * 核心念头：低头笔直扑上去的一记头撞——最短、最便宜、随时能用；撞实的人有几率被顶懵，
 * 而趁对手还在畏缩时再顶一记会更狠，所以它的价值在“一记接一记”里。
 *
 * 三幕：
 *   起（windup，提交前）：压低身子、后腿蹬地，只播预告表现。
 *   击（charge → impact / whiff）：提交后逐刻沿瞄准方向直线推进；trace 撞上活体即结算 smash 接触伤害、
 *       按 flinchChance 掷畏缩、把目标顶开 shove 格；撞空则一路冲到扑出距离尽头刹住。
 *   果（hit / miss）：命中浮字，畏缩的浮“撞懵”并按共享身份挂上本单元的效果；落空只扬一小片尘。
 *
 * 与同族分开：铁头更慢更重、把目标砸得最远；意念头锤会制导拐弯；双刃头锤自损。只有头锤把
 * “趁人懵再顶”写进威力（`smash` 里的 target 分支），是连续压制用的那一款。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `driving`（猛冲式）由 resolve 改时序、由公式改威力／距离／几率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const headbuttScene = "world_combat:move_headbutt";
    const headbuttFlinchEffect = "world_combat:headbutt_flinch";
    const headbuttFlinchText = "world_combat.move.headbutt.text.flinch";
    const headbuttHitText = "world_combat.move.headbutt.text.hit";
    const headbuttMissText = "world_combat.move.headbutt.text.miss";

    function headbuttFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, headbuttFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "headbutt",
        cooldownParameter: "recharge",
        name: "Headbutt",
        description: "低头笔直扑向对手的一记头撞：射程短、冷却短、随时能用；撞实的人有几率被顶懵，而趁对手还在畏缩时再顶一记会更凶狠——它的价值在连续压制里。",
        uses: ["短冷却的连续近身压制", "趁对手刚被顶懵时补一记更狠的", "低消耗地把对手顶离掩体"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.6,
        prepare: 7,
        active: 22,
        recover: 8,
        cooldown: 16,
        style: "contact",
        defaults: { driving: false, ai: { maxChase: 8, opening: "always" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("headbutt", "collisionRadius", pokemon) * 1.5, geometry: "line", style: "contact",
                color: 0xD8C8A8, label: config && config.driving === true ? "猛冲头锤" : "头锤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["headbutt"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("headbutt", "tempo", context)),
                recover: Math.round(p("headbutt", "aftercast", context)),
                cooldown: Math.round(p("headbutt", "recharge", context)),
                active: skills["headbutt"].active,
                range: p("headbutt", "lunge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("headbutt:windup", headbuttScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", driving: config && config.driving === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(headbuttScene);
            const world = action.world();
            const length = p("headbutt", "lunge", action);
            const speed = p("headbutt", "rush", action);
            const radius = p("headbutt", "collisionRadius", action);
            const traceAhead = p("headbutt", "traceAhead", action);
            const power = p("headbutt", "smash", action);
            const chance = p("headbutt", "flinchChance", action);
            const flinchTicks = Math.round(p("headbutt", "flinchTicks", action));
            const shove = p("headbutt", "shove", action);
            const direction = aim(action);
            const scale = radius / 0.5;
            const intensity = Math.max(0.5, Math.min(2.2, power / 70));
            let travelled = 0, settled = false;

            movementScenes.show(action, "charge", action.origin(), { moment: "charge", scale: scale, intensity: intensity, stride: Math.max(3, Math.round(length / 0.7)) });
            sound(action, "minecraft:entity.goat.prepare_ram");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 撞空：冲到尽头刹住，脚边扬起一小片尘。 */
            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, headbuttScene, 1, at, { moment: "miss", scale: scale }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), headbuttMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { whiff(current, origin); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const at = hit.position();
                    const landed = target !== null && impact(current, hit, "headbutt", power,
                        { damage: damageSpec("headbutt", "smash"), contact: true });
                    WorldFeedback.emit(scope, headbuttScene, 1, at,
                        { moment: "impact", target: target ? String(target.ref()) : "", scale: scale,
                            intensity: intensity, hits: Math.round(14 + power * 0.16) }, 26);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(shove));
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), headbuttHitText, [], 22);
                        if (scope.random() < chance && headbuttFlinch(scope, target, flinchTicks)) {
                            WorldFeedback.emit(scope, headbuttScene, 1, at, { moment: "stagger", target: String(target.ref()) }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), headbuttFlinchText, [], 24);
                        }
                    }
                    sound(current, "minecraft:entity.goat.ram_impact");
                    finish(current);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("headbutt", "minimumMove", current) || travelled >= length) {
                    whiff(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
