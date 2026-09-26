/**
 * 咬碎 / crunch 的客户端表现。
 *
 * 一句话：兽首压低、牙间蓄起暗紫光 → 沿直线扑出、脚边扬尘 → 咬实的一刻炸开暗色迸溅与骨白牙影 →
 * 咬住研磨、碎屑不断外翻 → 牙关合拢时压出一圈钢灰护甲碎片，被压塌的目标头顶浮出缺口。
 * 色相家族：深靛紫（0x4E3C6E）与骨白牙影（0xF0E6D2），钢灰碎片（0xA8B0C0）承担"护甲被碾碎"这一层；
 * 饱和紫只出现在暗色核心与咬实峰值的小面积。
 * 拍子：起 windup（口边聚光）→ 扑 pounce → 咬 bite（峰值）／ miss → 磨 grind（持续碎屑，贴得越紧牙弧收得越小）
 *      → 塌 crack（成功咬塌才播）／ 松 release（目标脱开或隔墙时断开）。
 * 范围：bite／grind／crack／release 都绑命中目标或命中点，画出的就是这一口咬中的位置与大小（data.scale 来自咬合判定）。
 * 运动：pounce 的尘迹沿施法者实际走过的直线铺开；grind 的碎屑贴接触点向内翻卷，半径由 `data.press`（真实身体间隙
 *      派生的贴合度）决定；crack 的碎片从咬点向外崩开；release 是一小团松口的气流。
 * 数：`data.morsels`（咬合威力派生）决定咬中迸溅与碎屑量，`data.grind`（研磨刻数）决定 grind 幕时长，
 * `data.shards`（咬塌级数派生）决定压塌碎片量，`data.intensity`（威力 / 80）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const CrunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "jaw_gather", bind: "source", offset: [0, 0.5, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x6A4E86, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "steel_haze", bind: "source", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.26, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.05, 0.02],
                    color: 0xA8B0C0, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        },
        pounce: {
            duration: 30,
            exit: { stop: 22, drain: 12 },
            emitters: [
                {
                    name: "pounce_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "heavy_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xD8C6E6, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        bite: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "fang_frames", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fang",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xF0E6D2, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "dark_burst", bind: "target", height: 0.44,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "morsels", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8A6AA8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "armor_shards", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "morsels", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xA8B0C0, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        grind: {
            duration: { data: "grind", fallback: 16 },
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "grind_press", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "sphere", radius: { data: "press", fallback: 0.26 } },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0x8A6AA8, alpha: [0.6, 0], light: "world", maxParticles: 110
                },
                {
                    name: "grind_shavings", bind: "target", height: 0.34,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 18, shape: { kind: "sphere", radius: { data: "press", fallback: 0.22 } },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xA8B0C0, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        release: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "let_go", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack_burst", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "shards", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x4E3C6E, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "crack_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24, at: 0 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0xA8B0C0, alpha: [0.6, 0], light: "world", maxParticles: 60
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
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crunch", 1, CrunchDefinition);
