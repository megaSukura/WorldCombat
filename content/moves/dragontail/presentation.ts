/**
 * 龙尾 / dragontail 的客户端表现。
 *
 * 一句话：施法者身后拢起一道龙鳞紫的尾光，随即抡尾在身前扫开一整片扇形——紫色的鳞光填满整个扇面、
 *   外缘拖出一道路径，被扫中的敌人身上炸开一记龙击并被抛向远处。
 * 色相家族：龙鳞紫（0x7C5CD8 主体、0x5B3FA8 余韵）＋淡紫白（0xE4DAFA）只给尾锋与外缘高光；没有第二个色相。
 * 拍子：起（windup 拢尾）→ 击（sweep 扇面铺开，只播一次）→ 结果（impact 逐目标龙击）→ 持续（flee 被打飞者的余尘）→ 空（miss 落空）。
 * 范围：sweep 的扇面用服务端算出的同一组顶点（`data.path`，原点＋圆弧采样）以 polygon 填满、polyline 勾边，
 *   画出来的就是判定覆盖的那片扇形；站在扇面外就扫不到。
 * 运动：鳞光从原点向外沿扇面铺开并上扬；被扫中者沿背离施法者的方向滑出、抛起。
 * 数：扇面鳞光数量由 `data.shards`（物攻派生）驱动；命中的那一记用 `data.primary`（是否正对目标）区分强弱。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonTailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.5, -0.5], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0x7C5CD8, alpha: [0.6, 0], light: "full", maxParticles: 44
                },
                {
                    name: "scale", bind: "source", offset: [0, 0.5, -0.5], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 4, interval: 4, repeats: 3 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.01],
                    color: 0xE4DAFA, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "polygon" },
                    direction: "shape", speed: [0.06, 0.24], spread: 20,
                    lifetime: [6, 13], size: [0.28, 0.06], sizeMode: "index",
                    color: 0x7C5CD8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 10 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.5, 0.14],
                    color: 0xE4DAFA, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "core", bind: "source", offset: [0, 0.35, 0.4], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "circle", radius: 0.6, thickness: 0 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.5, 0.16],
                    color: 0x7C5CD8, alpha: [0.6, 0], light: "world", maxParticles: 6
                }
            ]
        },
        impact: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.24], spread: 26,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x7C5CD8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 30
                },
                {
                    name: "lash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 2 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [6, 11], size: [0.42, 0.12],
                    color: 0xE4DAFA, alpha: [0.85, 0], light: "full", maxParticles: 8
                }
            ]
        },
        rout: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "mark", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.04],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xE4DAFA, alpha: [0.8, 0], light: "full", maxParticles: 3
                }
            ]
        },
        flee: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "dust", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8C78C8, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "overreach", bind: "source", offset: [0, 0.3, 0.6], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.7, thickness: 0 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x7C6BA8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragontail", 1, DragonTailDefinition);
