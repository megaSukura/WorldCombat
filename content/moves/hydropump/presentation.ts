/**
 * 水炮 / hydropump 的客户端表现。
 *
 * 一句话：身前后翻涌起一大团水（越收越满），随后整柱轰出去、拖着一堵宽水墙，命中处炸开巨大的水花，
 *   水花沿着落点漫开一圈、把落地点周围浇得湿亮；被浇透的人身上持续滴水。
 * 色相家族：深水蓝（0x2C86C8）与泡沫白（0xEAF9FF）；大面积低饱和的水墙 + 小面积高亮的水花核心。
 * 拍子：起 charge（翻涌蓄水）→ 轰 torrent（整柱 + 宽尾）→ 击 burst（大爆炸水花）→ 漫 douse／flood（漫开一圈）
 *   ／ 空 dud（打到硬面只剩水响）。
 * 范围：flood 的地面环用作者参考半径 2.4 格、按 `data.scale`（回溅半径 / 2.4）缩放，与服务端判定同一圈；
 *   玩家看水花铺到哪，就知道站哪会被浇到。
 * 运动：水柱沿准线慢而重地推进，水花向外炸开后受重力回落，地面一圈向外漫。
 * 数：`data.volume`（特攻＋等级换算的水量点）绑定蓄水与命中各层的发射量，`data.scale` 放大整幕，
 *   `data.intensity`（洪流威力 / 110）决定亮度与水花大小——两只精灵放同一招，画面不同。
 */
const HydropumpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "volume", fallback: 60 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.22, 0.06],
                    color: 0x2C86C8, alpha: [0.8, 0], light: "world", maxParticles: 130
                },
                {
                    name: "churn", bind: "source", offset: [0, 0.55, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 26, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xEAF9FF, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        torrent: {
            duration: 0,
            exit: { drain: 16 },
            emitters: [
                {
                    name: "head", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    trail: { minDistance: 0.28 }, rate: 40,
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 11], size: [0.5, 0.3],
                    color: 0x2C86C8, alpha: [0.95, 0], light: "full", maxParticles: 44
                },
                {
                    name: "wall", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    trail: { minDistance: 0.25 }, rate: 34,
                    direction: "velocity", speed: [0.0, 0.05], spread: 22,
                    drag: 0.93,
                    lifetime: [7, 13], size: [0.34, 0.06],
                    color: 0xDCF2FF, alpha: [0.75, 0], light: "world", maxParticles: 120
                },
                {
                    name: "droplets", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    trail: { minDistance: 0.35 }, rate: 20,
                    direction: "velocity", speed: [0.01, 0.08], spread: 30,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xEAF9FF, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "volume", fallback: 60 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.07, 0.3], spread: 24,
                    lifetime: [7, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "sheet", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "volume", fallback: 60 }, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.12, 0.4], spread: 10,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x2C86C8, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    burst: { count: 28, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [9, 16], size: [0.12, 0.02],
                    color: 0xEAF9FF, alpha: [0.9, 0], light: "full", maxParticles: 110
                }
            ]
        },
        douse: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "soak", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.09, 0.28], spread: 26,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [9, 15], size: [0.16, 0.03],
                    color: 0x2C86C8, alpha: [0.8, 0], light: "world", maxParticles: 44
                },
                {
                    name: "drip", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 8, shape: { kind: "circle", radius: 0.34 },
                    direction: "down", speed: [0.0, 0.02], gravity: 0.06,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xEAF9FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        flood: {
            duration: 30,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "pool", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    shape: { kind: "ring", radius: 2.4 },
                    burst: { count: { data: "volume", fallback: 60 }, at: 0 },
                    direction: "outward", speed: [0.03, 0.16], spread: 8,
                    lifetime: [10, 18], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x2C86C8, alpha: [0.7, 0], light: "world", maxParticles: 150
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "ring", radius: 2.4 },
                    burst: { count: 22, at: 0 },
                    direction: "outward", speed: [0.04, 0.2], spread: 6,
                    lifetime: [8, 14], size: [0.34, 0.08],
                    color: 0xEAF9FF, alpha: [0.55, 0], light: "full", maxParticles: 60
                }
            ]
        },
        dud: {
            duration: 16,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "spent", bind: "point", fit: "none", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.14, 0.03],
                    color: 0x2C86C8, alpha: [0.7, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hydropump", 1, HydropumpDefinition);
