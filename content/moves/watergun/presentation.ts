/**
 * 水枪 / watergun 的客户端表现。
 *
 * 一句话：口边先收出一小颗水珠，随后一道细水线「嗤」地喷出、拖着一条短水尾与细水珠，命中处溅起一小蓬水花。
 * 色相家族：浅水蓝（0x6FD3F2）与近白泡沫（0xEAF9FF）；饱和只出现在水弹本体与命中的小面积。
 * 拍子：起 charge（收珠）→ 喷 jet（水线 + 短尾）→ 击 splash（小水花）／ 空 dud（打到硬面只剩水响）。
 * 范围：本招是单体直线点射，画面靠细水线本身标出「这一条线上会被打到」，没有地面轮廓。
 * 运动：水线沿准线高速直飞（服务端 pressure），水尾贴地随速度方向后拖，水珠带轻微重力散落。
 * 数：`data.drops`（特攻换算的水花量）绑定命中与飞行的水点数量，`data.intensity`（威力 / 40）放大整幕，
 *   `data.scale`（判定半径 / 0.2）让大个子的水线更粗——两只精灵放同一招时画面不同。
 */
const WatergunDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 10,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "bead", bind: "source", offset: [0, 0.5, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0x6FD3F2, alpha: [0.85, 0], light: "full", maxParticles: 26
                },
                {
                    name: "suck", bind: "source", offset: [0, 0.5, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 8, shape: { kind: "ring", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 11], size: [0.12, 0.02],
                    color: 0xDCF6FF, alpha: [0.55, 0], light: "world", maxParticles: 20
                }
            ]
        },
        jet: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    trail: { minDistance: 0.26 }, rate: 28,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [5, 9], size: [0.3, 0.16],
                    color: 0x6FD3F2, alpha: [0.95, 0], light: "full", maxParticles: 32
                },
                {
                    name: "tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    trail: { minDistance: 0.2 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.04], spread: 14,
                    drag: 0.94,
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xDCF6FF, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "beads", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    trail: { minDistance: 0.3 }, rate: 14,
                    direction: "velocity", speed: [0.01, 0.06], spread: 26,
                    gravity: 0.04, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xEAF9FF, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        splash: {
            duration: 16,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "hit", bind: "point", fit: "none", offset: [0, 0.36, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.24], spread: 22,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 44
                },
                {
                    name: "sheet", bind: "point", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.28], spread: 12,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x6FD3F2, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 28,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xEAF9FF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        dud: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "drip", bind: "point", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x6FD3F2, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_watergun", 1, WatergunDefinition);
