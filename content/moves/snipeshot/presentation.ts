/**
 * 狙击 / snipeshot 的客户端表现。
 *
 * 一句话：施法者举枪屏息、枪口聚起一点冷光 → 选定对手身上亮起一圈准星 → 一发拉长水线的高速水弹穿过前排、
 *   只在那只身上炸开一蓬冷水；擦过的挡路者身上只掠过一道水痕。
 * 色相家族：冷水青（0x6FD3F2 / 0x2C86C8）为主体，近白（0xEAF9FF）只给准星与击点高光。
 * 拍子：起 aim（聚光）→ 锁 mark（准星）→ 射 shot（水弹）→ 击 strike（命中）/ pierce（穿透）/ graze（掠过）→ 收。
 * 范围：mark 与 strike 都绑在锁定目标身上；准星落在谁头上，玩家就知道这一枪只打谁，`data.scale` 随判定半径变化。
 * 运动：水弹沿命中方向直线高速飞行（服务端投射物 + 追踪），命中向外炸水花。
 * 数：`data.motes`（特攻派生）绑定命中水花量，`data.intensity`（单发威力）缩放整体强弱；画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SnipeshotMoveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        aim: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "focus", bind: "source", offset: [0, 0.55, 0.3], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xEAF9FF, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 28
                },
                {
                    name: "bead", bind: "source", offset: [0, 0.55, 0.32], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.12 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0x6FD3F2, alpha: [0.7, 0], light: "full", maxParticles: 22
                }
            ]
        },
        mark: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crosshair", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 4, repeats: 4 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [8, 14], size: [0.26, 0.1],
                    color: 0x6FD3F2, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "pin", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 4, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xEAF9FF, alpha: [0.85, 0], light: "full", maxParticles: 26
                }
            ]
        },
        shot: {
            duration: 40,
            exit: { stop: 34, drain: 10 },
            emitters: [
                {
                    name: "jet", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 9], size: [0.13, 0.02],
                    color: 0x6FD3F2, alpha: [0.9, 0], light: "world", maxParticles: 36
                },
                {
                    name: "trail", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    trail: { minDistance: 0.32 }, rate: { data: "motes", fallback: 16 },
                    direction: "down", speed: [0.0, 0.04], spread: 16, gravity: 0.03, drag: 0.94,
                    lifetime: [6, 13], size: [0.07, 0.012],
                    color: 0xEAF9FF, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "motes", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.09, 0.3], spread: 24,
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEAF9FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "cold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 15], size: [0.22, 0.06],
                    color: 0x2C86C8, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        pierce: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x6FD3F2, alpha: [0.6, 0], light: "world", maxParticles: 20
                },
                {
                    name: "past", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0x2C86C8, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        graze: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ripple", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 13], size: [0.16, 0.04],
                    color: 0x6FD3F2, alpha: [0.55, 0], light: "world", maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "splash", bind: "source", offset: [0, 0.4, 0.3], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0x2C86C8, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_snipeshot", 1, SnipeshotMoveDefinition);
