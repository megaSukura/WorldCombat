/**
 * 必杀门牙 / hyperfang 的客户端表现。
 *
 * 一句话：兽首张大、门牙泛白 → 沿直线扑出、脚边扬尘 → 咬死的一刻炸开骨白牙影与迸溅 →
 * 咬住沿瞄准轴猛甩、碎屑沿甩势扯出 → 被甩懵的目标头顶转起一圈星子。
 * 色相家族：骨白（0xF4EEDC）与暖琥珀（0xF0C878）＋中性尘；饱和琥珀只出现在甩动的弧线与咬中峰值的小面积。
 * 拍子：起 windup（口边聚光）→ 扑 pounce → 咬 bite（峰值）／ miss → 甩 shake → 懵 stun。
 * 范围：bite／shake／stun 都绑命中目标，画出的就是这一口咬中的位置与大小（data.scale 来自咬合判定）。
 * 运动：pounce 的尘迹沿施法者实际走过的直线铺开；shake 的弧线沿 data.direction 的横轴被扯开；stun 的星子绕头顶转。
 * 数：`data.morsels`（咬合威力派生）决定咬中迸溅量，`data.sparks`（侧向甩出量派生）决定甩动的碎屑与弧线量，
 * `data.stun`（畏缩持续刻数）决定懵圈的星子量，`data.intensity`（威力 / 84）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HyperfangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "maw_gather", bind: "source", offset: [0, 0.5, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xF4EEDC, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 38
                },
                {
                    name: "fang_glint", bind: "source", offset: [0, 0.46, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    rate: 10, spriteFrom: "random", shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xF0C878, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        pounce: {
            duration: 26,
            exit: { stop: 18, drain: 12 },
            emitters: [
                {
                    name: "pounce_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 28, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xD8CEB8, alpha: [0.5, 0], light: "world", maxParticles: 130
                },
                {
                    name: "pounce_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "box", size: [0.3, 0.26, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xF0E4C8, alpha: [0.4, 0], light: "full", maxParticles: 110
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.48,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF4EEDC, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 26
                },
                {
                    name: "bite_impact", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "morsels", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF0E4C8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        shake: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "whip_arc", bind: "target", height: 0.5, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/scratch_yellow",
                    burst: { count: { data: "sparks", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "line", length: 0.7 },
                    orient: "direction", direction: "shape",
                    speed: [0.12, 0.32], spread: 14,
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xF0C878, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "whip_debris", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xD8CEB8, alpha: [0.6, 0], light: "world", maxParticles: 110
                }
            ]
        },
        stun: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "dazed_stars", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "stun", fallback: 10 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.34, rotation: [80, 0, 0] },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xF0C878, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xD8CEB8, alpha: [0.5, 0], light: "world", maxParticles: 56
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hyperfang", 1, HyperfangDefinition);
