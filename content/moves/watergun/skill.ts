/**
 * 水枪 / watergun 的出手方式。
 *
 * 核心念头：**一道又细又快、顺手就能喷的水线**。它不做范围、不留状态、不贯穿，卖的是「随时能喷、
 *   边走边打」——起手短、收招短、冷却短、PP 省，是缠斗里的随手点射；代价是单发最轻。
 *   它也是本组四式里唯一 `stationary: false`、可以在移动中出手的一招（玩家/伙伴边跑边喷）。
 *
 * 两幕（简单念头一幕就完整，这里起手与喷射两拍）：
 *   起（charge，提交前）：水在口边收成一小颗、向内聚拢，只播预告；不提交、可被打断。
 *   喷（jet → splash / dud，提交后）：细水线沿瞄准方向高速喷出，拖着一条短水尾与细水珠；
 *       命中非友方结算一次 `spout` 特殊伤害，落点溅起 `drops` 点水花；打到墙或地面只有一声水响（dud）。
 *
 * 与场上最像的招分开：水波刀是笔直贯穿的刀刃、加农水炮是高压水柱把人顶开——水枪只是一小口水弹，
 *   既不贯穿也不留湿；画面是「小水弹 + 短尾 + 小水花」。
 *
 * 配置 `charge`（蓄压式）由公式改威力／判定／速度／射程／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const watergunScene = "world_combat:move_watergun";

    define({
        id: "watergun",
        name: "Water Gun",
        description: "喷出一道又细又快的水线直取目标：出手短、冷却短、可以边走边喷，是缠斗里的随手点射。蓄压式换成一记更重的水弹，代价是更慢、更近、更贵。",
        uses: ["贴身缠斗里边跑边喷，随手补伤害", "起手最快、PP 最省的远程点射", "先用便宜的一发把伤害挂上，再交给重招"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 6,
        active: 0,
        recover: 5,
        cooldown: 16,
        stationary: false,
        style: "water",
        defaults: { charge: false, ai: { maxChase: 13, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("watergun", "reach", pokemon), geometry: "line", style: "water",
                color: 0x6FD3F2, label: config && config.charge === true ? "蓄压水枪" : "水枪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["watergun"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("watergun", "tempo", context)),
                recover: Math.round(p("watergun", "aftercast", context)),
                cooldown: Math.round(p("watergun", "recharge", context)),
                active: 0,
                range: p("watergun", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("watergun:charge", watergunScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", drops: Math.round(p("watergun", "drops", action)),
                    charged: config && config.charge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("watergun", "spout", action);
            const speed = Math.max(0.5, p("watergun", "pressure", action));
            const radius = Math.max(0.14, p("watergun", "radius", action));
            const drops = Math.max(10, Math.round(p("watergun", "drops", action)));
            const charged = !!(config && config.charge);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 40));
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.watergun.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                lifetime: Math.max(24, Math.round(action.range() / Math.max(0.2, speed) + 16)),
                appearance: { sprite: "cobblemon:generic/water/waterjet_head", tint: 0x6FD3F2, glow: true,
                    scale: Math.max(0.6, Math.min(1.4, radius / 0.2)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        if (!impact(current, hit, "watergun", power, { damage: damageSpec("watergun", "spout") })) return;
                        WorldFeedback.emit(scope, watergunScene, 1, point,
                            { moment: "splash", target: String(victim.ref()), drops: drops, scale: scale,
                                intensity: intensity, charged: charged ? 1 : 0 }, 20);
                        sound(current, "cobblemon:move.watergun.target");
                        sound(current, "cobblemon:impact.water");
                    } else {
                        WorldFeedback.emit(scope, watergunScene, 1, point,
                            { moment: "dud", drops: drops, scale: scale, intensity: intensity }, 18);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, "watergun:jet:" + action.id(), watergunScene, 1, origin,
                { moment: "jet", projectile: flight, drops: drops, scale: scale, intensity: intensity,
                    charged: charged ? 1 : 0 }, 80);
        }
    });
}
