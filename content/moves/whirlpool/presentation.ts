/**
 * 潮旋 / whirlpool 的客户端表现。
 *
 * 一句话：施法者脚边先卷起一股回旋水花，随后一道水箭贴着水面追向目标，命中处炸开成一片向心回旋的水环；
 * 水环持续把周围的水往涡心收，圈里的人不断被水带走、偶尔整片灌满；水势到点后散成一地水花。
 * 色相家族：深水蓝（0x3A78C2）为主、白沫青（0xBFE8FF）做水面高光、砂褐只在被卷起的地面碎屑上出现。
 * 拍子：起（charge 聚水）→ 掷（cast 水箭）→ 驻（grip 立涡 / churn 回旋 / squeeze 灌水）→ 收（release / slip）。
 * 范围：grip 与 churn 都是 `bind: "point"`、`fit: "none"`，用 `data.radius` 画水环，画出来的圈就是回拉生效的那块水面。
 * 运动：水箭沿目标追踪；水面粒子朝涡心收拢、白沫沿圈打转；灌水时向上炸开一束。
 * 数：`data.flow`（涡面半径派生）决定水面密度，`data.count`（灌水威力派生）决定灌水那下迸出的水花量，
 *   `data.intensity`（威力 / 24）抬高亮度，`data.scale`（半径 / 1.15）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const WhirlpoolDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 24, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 14,
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0x3A78C2, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.3, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.07],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        cast: {
            duration: 50,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "jet", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 40, shape: { kind: "sphere", radius: 0.18 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 14, trail: { minDistance: 0.22 },
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "drag", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: 2, interval: 1, repeats: 16 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08], spread: 22,
                    lifetime: [7, 12], size: [0.09, 0.02],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        grip: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 28, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.15 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7],
                    color: 0xBFE8FF, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "splash", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0x9FD8FF, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        churn: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "pool", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1.15 } },
                    direction: "inward", speed: [0.02, 0.1], spin: 10,
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x3A78C2, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "column", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.15 }, length: 1.4 },
                    direction: "up", speed: [0.02, 0.1], spread: 10, spin: 16,
                    gravity: -0.005, drag: 0.95,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9FD8FF, alpha: [0.35, 0], light: "world", maxParticles: 200
                },
                {
                    name: "foam", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 18, shape: { kind: "circle", radius: { data: "radius", fallback: 1.15 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xBFE8FF, alpha: [0.5, 0], light: "full", maxParticles: 90
                }
            ]
        },
        squeeze: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "surge", bind: "target", offset: [0, 0.1, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "spray", bind: "target", offset: [0, 0.1, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "world", maxParticles: 80
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.15 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.24, 0.5],
                    color: 0x9FD8FF, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "drops", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.12],
                    gravity: 0.08,
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0xBFE8FF, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slip: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "snap", bind: "target", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0x9FD8FF, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0xBFE8FF, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_whirlpool", 1, WhirlpoolDefinition);
