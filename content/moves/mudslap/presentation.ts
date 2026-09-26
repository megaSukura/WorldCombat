/**
 * 掷泥 / mudslap 的客户端表现。
 *
 * 一句话：一把湿泥在身前团成球，沿低弧线甩出去，糊在目标或方块接触面上，泥点四溅、泥印挂住。
 * 色相家族：湿泥的棕（0x6E5438）与浅褐（0x9A7B54），余韵收在近白的细点。
 * 拍子：起 gather（抓泥收拢）→ 击 splat（按真实表面朝向铺开泥印）→ 收 face（脸上泥迹挂住后慢慢干掉）。
 * 范围：splat 的泥印盘半径由 `data.scale`（碰撞箱比）铺开；`data.direction` 是原生方块面的外法线或命中来向，
 *       用 orient:"direction" 让泥印贴在真实那一面，而不是浮空画圈。
 * 运动：泥团沿弧线（服务端下发的 ballistic 方向）飞出，身后拖泥点；脸上泥点向下滴。
 * 数：gather/splat 的泥点数绑定 `data.splash`（体重与等级换算），splat 爆开强度绑定 `data.intensity`（威力 / 22）。
 * 长期视觉（face）按 `data.tick` 存续，淡出后不改变已结算的命中下降。
 */
const MudslapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "clump", bind: "source", offset: [0, 0.35, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "thick", fallback: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.0, 0.03],
                    lifetime: [8, 14], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0x6E5438, alpha: [0.7, 0.1], light: "world", maxParticles: 26
                },
                {
                    name: "draw_in", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9A7B54, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        throw: {
            emitters: [
                {
                    name: "clod", bind: "projectile", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    trail: { minDistance: 0.3 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.24, 0.14],
                    color: 0x6E5438, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spray_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.22 }, rate: { data: "splash", fallback: 20 },
                    direction: "velocity", speed: [0.0, 0.04], spread: 20,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x9A7B54, alpha: [0.75, 0], light: "world", maxParticles: 90
                }
            ]
        },
        splat: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "imprint", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash", spriteFrom: "random",
                    burst: { count: { data: "splash", fallback: 16 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 0.5 } },
                    orient: "direction", direction: "shape", speed: [0.0, 0.04], spread: 18,
                    gravity: 0.01, drag: 0.86,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x6E5438, alpha: [0.95, 0], light: "world", maxParticles: 90
                },
                {
                    name: "drip_glints", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "splash", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.08, 0.24], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9A7B54, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        face: {
            duration: { data: "tick", fallback: 60 },
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "mask", bind: "target", offset: [0, 0.9, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash", spriteFrom: "random",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.0, 0.015],
                    lifetime: [16, 30], size: [0.15, 0.05],
                    color: 0x6E5438, alpha: [0.85, 0.15], light: "world", maxParticles: 14
                },
                {
                    name: "drips", bind: "target", offset: [0, 0.8, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.0, 0.02],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0x9A7B54, alpha: [0.7, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mudslap", 1, MudslapDefinition);
