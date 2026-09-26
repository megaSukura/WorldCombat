/**
 * 流水旋舞 / aquastep 的客户端表现。
 *
 * 一句话：脚边先荡开一圈水纹，随后整个人在对手身边一步一圈水花地点踏几拍，最后一拍拧身扫出一整圈水刃，
 * 水花在圈里炸开。色相家族：青蓝（water_ripple / splash / waterjet / impact_water，0x4FC3E8），泡沫近白。
 * 拍子：起（bow 水纹）→ 舞（step × N 每拍一圈）→ 击（spin 整圈水刃）→ 提（boost）。
 * 范围：spin 的一整圈半径就是判定半径（`data.scale` 由 reach 派生），玩家看得出站进圈里会被扫到。
 * 运动：step 的水花贴地向外荡开、细沫上抛；spin 的水刃沿圈向外甩、命中点炸开。
 * 数：水花数量绑定 `data.splash`（速度与雨量派生），命中强弱绑定 `data.intensity`（旋舞威力派生），
 *   拍数绑定 `data.steps`、当前第几拍绑定 `data.index`。
 */
const AquastepDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bow: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "ripple", bind: "source", offset: [0, 0.05, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.3, 0.5],
                    color: 0x4FC3E8, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "beads", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "ring", radius: 0.5 }, direction: "up", speed: [0.04, 0.14],
                    gravity: 0.02, lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xBFEFFF, alpha: [0.7, 0], light: "world", maxParticles: 26
                }
            ]
        },
        step: {
            duration: 20,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    // 整圈水纹只在真的迈出这一步时亮起（data.ring 由位移回执给出）。
                    name: "ring", bind: "source", offset: [0, 0.06, 0], height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "ring", fallback: 1 } }, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [9, 15], size: [0.34, 0.5],
                    color: 0x4FC3E8, alpha: [0.65, 0], light: "world", maxParticles: 20
                },
                {
                    name: "splash", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: { data: "splash", fallback: 22 } }, shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.05, drag: 0.9,
                    lifetime: [7, 13], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xDFF6FF, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "foam", bind: "source", offset: [0, 0.18, 0], height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "splash", fallback: 14 }, shape: { kind: "ring", radius: 0.45 }, direction: "up", speed: [0.05, 0.18],
                    gravity: 0.04, lifetime: [7, 12], size: [0.08, 0.02],
                    color: 0xBFEFFF, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spin: {
            duration: 24,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "blade", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: { data: "splash", fallback: 22 } }, shape: { kind: "ring", radius: 2.2 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [8, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 150
                },
                {
                    name: "disc", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1 }, shape: { kind: "circle", radius: 2.2, thickness: 0.95 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 18], size: [0.5, 0.9],
                    color: 0xBFEFFF, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "burst", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "splash", fallback: 22 } }, shape: { kind: "sphere_surface", radius: 2.2 },
                    direction: "shape", speed: [0.1, 0.32],
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8FBFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                }
            ]
        },
        boost: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 16], size: [0.3, 0.55],
                    color: 0x4FC3E8, alpha: [0.65, 0], light: "world", maxParticles: 20
                },
                {
                    name: "speed", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16], lifetime: [9, 16], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8FBFF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aquastep", 1, AquastepDefinition);
