/**
 * 双倍奉还 / counter 的客户端表现。
 *
 * 一句话：施法者沉身收势、把挨过的格斗劲收进拳里（账越大收得越多）→ 迎上去撞上目标的一刻，
 * 把那笔账加倍炸在对手身上；没有账时只是空挥一下、散去一缕灰烟。
 * 色相家族：暖橙与米白（impact_fighting / scalingshaded / glowingsparkle_yellow），落空时降为灰。
 * 拍子：起 brace（收势）→ 击 strike（命中）／空 whiff（落空）。
 * 范围：strike 的爆环半径由 `data.scale`（判定半径派生）给出，玩家看出这一拳能咬住多大的圈。
 * 运动：brace 的气由外向内收；strike 的碎片由内向外炸。
 * 数：`data.gather`（账本伤害派生）决定收势粒子速率，`data.count`（最终返还伤害派生）决定命中碎片数量，
 *   `data.power` 抬高亮度；画面里的数量与机制里的数一致。
 */
const CounterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "intake", bind: "source", offset: [0, 0, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "gather", fallback: 20 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.14], spread: 22,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE08A3C, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.55, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFD27A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 50
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF2A44C, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.12, 0.36], spread: 24,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFE0A0, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0xC97A2E, alpha: [0.65, 0], light: "full"
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0x8A8A8A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "trail", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 5 },
                    shape: { kind: "line", length: 0.5 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [6, 10], size: [0.18, 0.04],
                    color: 0xB8B8B8, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_counter", 1, CounterDefinition);
