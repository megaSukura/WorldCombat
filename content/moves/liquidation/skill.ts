/**
 * 水流裂破 / liquidation 的出手方式。
 *
 * 念头的形状：水先聚成一层贴身的刃（windup，提交前只播预告）→ 裹着水刃直线撞出去（shroud）→
 * 撞实的一刻水刃在接触面整个劈开（impact）：打伤、顶开、留下湿身；顺着裂口有概率把目标防御压下一级，
 * 并在它身上留下共享身份 `world_combat:status/sundered`（护甲已被撕开，别的单元可以消费）。
 * 目标若已带湿身，本次不再重复挂湿。撞空则一路冲完收势（miss）。
 * 两幕：shroud → impact + crack。提交后才触碰世界。配置 shred 通过 resolve 改变时序与公式取值。
 */
namespace PokemonSkills {
    const liquidationScene = "world_combat:move_liquidation";
    const LiquidationSoaked = "world_combat:liquidation_soaked";
    const LiquidationSundered = "world_combat:liquidation_sundered";
    const liquidationHitText = "world_combat.move.liquidation.text.hit";
    const liquidationCrackText = "world_combat.move.liquidation.text.crack";
    const liquidationMissText = "world_combat.move.liquidation.text.miss";

    define({
        id: "liquidation",
        name: "Liquidation",
        description: "The user slams into the target using a full-force blast of water. This may also lower the target's Defense stat.",
        uses: ["裹水正面撞一个目标", "撕开硬目标的护甲", "给目标挂上湿身，留给后续的水与电"],
        kind: "enemy",
        range: 4,
        maxRange: 7,
        prepare: 7,
        active: 30,
        recover: 9,
        cooldown: 40,
        style: "water",
        defaults: { shred: false, ai: { maxChase: 9, crack: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["liquidation"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const shred = !!(config && config.shred);
            return {
                prepare: p("liquidation", "prepare", context) + (shred ? 3 : 0),
                recover: p("liquidation", "recover", context),
                cooldown: p("liquidation", "cooldown", context) + (shred ? 8 : 0),
                range: p("liquidation", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_liquidation:windup", liquidationScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shred: !!(config && config.shred) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("liquidation", "charge", action);
            const speed = p("liquidation", "dashSpeed", action);
            const radius = p("liquidation", "collisionRadius", action);
            const power = p("liquidation", "crash", action);
            const chance = p("liquidation", "shredChance", action);
            const stages = Math.max(1, Math.round(p("liquidation", "shredStages", action)));
            const soakTicks = Math.max(20, Math.round(p("liquidation", "soakTicks", action)));
            const push = p("liquidation", "push", action);
            const direction = aim(action);
            const scale = radius / 0.5;
            const intensity = Math.max(0.5, Math.min(2.2, power / 85));
            let travelled = 0, settled = false;

            WorldFeedback.keep(world, "liquidation:wake:" + String(action.actor().ref()), liquidationScene, 1, action.origin(),
                { moment: "shroud", scale: scale, intensity: intensity, ratio: 0 }, 12);
            sound(action, "cobblemon:move.waterpulse.actor");

            function land(current: CombatAction, moment: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, liquidationScene, 1, body.position(), { moment: moment, scale: scale }, 22);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), liquidationMissText, [], 22);
                }
                sound(current, "minecraft:entity.generic.splash");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, "miss"); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(p("liquidation", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "liquidation", power, { damage: damageSpec("liquidation", "crash"), contact: true });
                    WorldFeedback.emit(scope, liquidationScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", scale: scale, intensity: intensity,
                            bursts: Math.round(18 + power * 0.24) }, 28);
                    sound(current, "cobblemon:impact.water");
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(push));
                        if (!CombatStatus.has(scope, target, "soaked"))
                            CombatStatus.apply(scope, target, "soaked", LiquidationSoaked, soakTicks);
                        if (scope.random() < chance) {
                            NativeEffects.boost(scope, target, "def", -stages);
                            CombatStatus.apply(scope, target, "sundered", LiquidationSundered, soakTicks, 0, { unique: true });
                            WorldFeedback.emit(scope, liquidationScene, 1, point,
                                { moment: "crack", target: String(target.ref()), stages: stages, spokes: stages * 10, scale: scale }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), liquidationCrackText, [stages], 26);
                            sound(current, "minecraft:block.glass.break");
                        } else {
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), liquidationHitText, [], 22);
                        }
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("liquidation", "minimumMove", current) || travelled >= length) { land(current, "miss"); return; }
                // 水壳沿途拖出湿痕，让“裹着水冲”这件事在整段位移上都看得见。
                WorldFeedback.keep(scope, "liquidation:wake:" + String(current.actor().ref()), liquidationScene, 1, origin,
                    { moment: "shroud", scale: scale, intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, length)) }, 8);
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
