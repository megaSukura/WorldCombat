/**
 * 圣剑 / sacredsword 的客户端表现。
 *
 * 一句话：身侧拉出一道金白刃光，随后一记极长的斜切沿着刃程一路划到最远端，刃口亮成一条金线，
 *   被切中的目标处炸开格斗系冲击。
 * 色相家族：金白（0xE8E0A8）作主体、暖金（0xA89050）作余韵、近白（0xFFF6D0）作刃口强调；无第二个色相。
 * 拍子：起 draw（拉刃聚光）→ 斩 slash（长切痕）→ 中 cut（格斗冲击）／空 miss（空挥）。
 * 范围：slash 的长切痕用 `data.path`（与服务端同一起止两端）画成一条横跨刃程的亮线，那条线就是判定范围。
 * 运动：刃光沿 `data.path` 从近端扫到远端，命中从落点向外爆。
 * 数：刃光量绑 `data.gleam`（物攻换算），命中强度绑 `data.intensity`（威力 / 90），切痕长度与尺寸绑 `data.scale`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SacredswordDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 12,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.55, 0.25], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 11, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.11, 0.02],
                    color: 0xFFF6D0, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        slash: {
            duration: 18,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" }, burst: { count: 8 },
                    direction: "shape", orient: "direction", speed: [0.12, 0.3],
                    lifetime: [5, 9], size: [0.42, 0.08], sizeMode: "index",
                    color: 0xE8E0A8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "gleam", fallback: 14 } },
                    direction: "shape", orient: "direction", speed: [0.1, 0.26],
                    lifetime: [4, 8], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF6D0, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "hilt", bind: "source", offset: [0, 0.7, 0.1], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 5, at: 0 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [4, 8], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFF6D0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 18
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 9, at: 0 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.07, 0.2], spread: 22,
                    lifetime: [4, 8], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF6D0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "sparks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "gleam", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 26,
                    lifetime: [6, 12], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xE8E0A8, alpha: [0.8, 0], gravity: 0.04, light: "world", maxParticles: 44
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.55, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "gleam", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.32, angleDegrees: 22 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xA89050, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sacredsword", 1, SacredswordDefinition);
