/**
 * 冲天拳 / skyuppercut 的客户端表现。
 *
 * 一句话：蹲身把拳收到腰下、脚下蹬起一圈尘，随后一道竖直的弧线贴着身前挑上去，被顶中的目标身上炸开格斗冲击、
 * 整个人带着一串上冲的气流离开地面，在头顶停一瞬再落下。
 * 色相家族：暖琥珀（0xFFC06A）作主体、暖白（0xFFF4DC）作强调、红棕（0xD8843A）作细节；中性尘屑收尾。
 * 拍子：起 wind（收拳蓄劲）→ 击 rise（竖直弧挑出）与 launch（顶起）→ 收 hang（空中停留）／whiff（挑空）。
 * 范围：rise 的竖直弧用 `data.path`（与服务端扇面同一条挑线）画出来，玩家一眼看出身前这一柱会被挑到。
 * 运动：挑线沿 `data.direction` 从腰下向头顶上升；被顶起的目标身上气流向上、尘屑带重力落下。
 * 数：挑线粒子量绑 `data.sparks`（物攻换算），竖直高度绑 `data.airReach`（身高换算），命中爆点绑同一个值。
 */
const SkyuppercutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: 12,
            exit: { stop: 6, drain: 9 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, -0.18, 0.16], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xFFF4DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "press", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xD8843A, alpha: [0.5, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 26
                }
            ]
        },
        rise: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "sparks", fallback: 12 } },
                    direction: "shape", orient: "direction", speed: [0.1, 0.3], spread: 12,
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "fist", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    shape: { kind: "polyline" }, burst: { count: { data: "sparks", fallback: 12 } },
                    direction: "shape", orient: "direction", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFF4DC, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "soil", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 11, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xD8843A, alpha: [0.5, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        launch: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "toss", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xD8843A, alpha: [0.55, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 34
                }
            ]
        },
        hang: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stall", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xFFF4DC, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "motes", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.12, 0.03],
                    color: 0xFFF4DC, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 30, rotation: [0, 0, 0] },
                    direction: "up", speed: [0.1, 0.26],
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skyuppercut", 1, SkyuppercutDefinition);
