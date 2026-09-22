/**
 * 十字剪 / xscissor 的客户端表现。
 *
 * 一句话：两侧刃势先向左右张开，随后左刃斜落、右刃斜落，在中轴的目标身上交叉成一个亮绿的 X；
 * 只被一片刃蹭到的目标只闪一道斜光。
 * 色相家族：亮绿与黄绿（softswipe／impact_bug／smallsparkle）＋近白高光（cut）＋中性尘（tinydust）。
 * 拍子：起（windup 张臂）→ 合（blade 左刃、blade 右刃、clip 命中）→ 成（cross 交叉成 X）。
 * 范围：blade 的斜线用 `data.path`（与服务端从身体两侧伸向合剪点的同一组顶点）画；cross 的两段也走 path，
 *   两条交叉线盖到的位置就是被完整剪断的位置。
 * 运动：两条刃势从身体两侧一左一右斜向合拢，命中的碎屑在目标身上向外爆，成 X 时两段亮线交叉划过。
 * 数：`data.sparks`（每刃威力换算）绑定命中碎屑量，`data.notes`（合剪威力换算）绑定 X 的亮点与线条密度，
 *   `data.second` 标记这一下是第二刃（吃加成），`data.side` 让左右刃可分辨。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const XscissorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "left_gather", bind: "source", offset: [-0.45, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xA6D44E, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "right_gather", bind: "source", offset: [0.45, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xC8E86A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        blade: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "arm_stroke", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.05, 0.18], spread: 8,
                    lifetime: [5, 10], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xE4F6C0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "arm_edge", bind: "path", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 18, direction: "shape", speed: [0.06, 0.2], spread: 8,
                    lifetime: [5, 9], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF6FFE4, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        clip: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "clip_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "sparks", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE2F2A8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 44
                }
            ]
        },
        cross: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "cross_stroke", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 46, direction: "shape", speed: [0.06, 0.2], spread: 8,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF8FFE8, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 110
                },
                {
                    name: "cross_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "notes", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.07, 0.24], spread: 26,
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC8EE6A, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "cross_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0xEAFAC0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x9AB06A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_xscissor", 1, XscissorDefinition);
