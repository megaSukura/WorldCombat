/**
 * 断头钳 / guillotine 的客户端表现。
 *
 * 一句话：两片大钳在身侧张开、齿缝透出寒光，身前一段扇形先被描出来；合拢的一刻，钳齿在目标身上交错咬合、
 * 崩出一圈碎屑；夹空则两片钳口在空处"咔"地闭上，只扬起点点尘。
 * 色相家族：骨白与铁灰（0xB0A48C / 0xE8E2D2 / 0x8A8272）为主体，近白 0xFFFFFF 只给咬合那一下的核心——
 *   只有一种色相，冷硬、干净，与地裂的土黄、角钻的金属暖调、绝对零度的青蓝分开。
 * 拍子：起（windup 钳口张开）→ 定（mark 扇形预览，持续合拢延迟）→ 击（snap 咬合 / miss 空合）。
 * 范围：mark 的水平扇面与锥缘读 `data.scale = 实际钳口长度 / 2.4` 放大、张角读 `data.arc`，玩家看到的扇形就是钳口罩住的范围。
 * 运动：两片钳口从两侧向中轴合拢，咬合时碎屑从目标身上向外迸开、钳齿绕轴交错。
 * 数：`data.grip`（物攻派生）决定咬合碎屑密度，`data.scale` 放大钳齿。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GuillotineDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "open", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 4, at: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06], spin: 20,
                    lifetime: [8, 16], size: [0.34, 0.1],
                    color: 0xE8E2D2, alpha: [0.6, 0], light: "world", maxParticles: 16
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "maw", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "grip", fallback: 18 }, shape: { kind: "sector", radius: { data: "span", fallback: 2.4 }, angleDegrees: { data: "arc", fallback: 130 } },
                    direction: "outward", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A8272, alpha: [0.4, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rim", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    rate: 22, shape: { kind: "sector", radius: { data: "span", fallback: 2.4 }, angleDegrees: { data: "arc", fallback: 130 }, innerRadius: { data: "span", fallback: 2.4 } },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0xB0A48C, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "jaw_a", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 2, repeats: 3, interval: 5, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.3, 0.08],
                    color: 0xE8E2D2, alpha: [0.55, 0], light: "world", maxParticles: 14
                }
            ]
        },
        snap: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "grip", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.5], spread: 26,
                    lifetime: [6, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "shear", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.28], spread: 30, spin: 40,
                    lifetime: [8, 16], size: [0.34, 0.08],
                    color: 0xE8E2D2, alpha: [0.9, 0], light: "world", maxParticles: 24
                },
                {
                    name: "clasp", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 3, at: 1 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.4, 0.12],
                    color: 0xB0A48C, alpha: [0.8, 0], light: "world", maxParticles: 10
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "snip", bind: "point", offset: [0, 0.7, 0], height: 0, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 4, at: 1 }, shape: { kind: "line", length: 1.6 },
                    direction: "shape", speed: [0.02, 0.12], spin: 20,
                    lifetime: [6, 12], size: [0.24, 0.05],
                    color: 0xE8E2D2, alpha: [0.5, 0], light: "world", maxParticles: 12
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x8A8272, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_guillotine", 1, GuillotineDefinition);
