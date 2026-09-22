/**
 * 咬住 / bite 的客户端表现。
 *
 * 一句话：暗色牙光在口边聚一下 → 沿一条直线扑出、脚边扬尘 → 咬实的一刻在接触点炸开暗色迸溅与獠牙剪影，
 * 随即一道碎屑被拽回施法者身前；被咬懵的人头顶晃出暗色星子。
 * 色相家族：暗紫（0x6A4E86 / 0x8A6AA8）与獠牙骨白（0xF0E6D2）；饱和色只出现在暗色核心一点。
 * 拍子：起 windup（口边聚光）→ 扑 pounce → 咬 bite（命中峰值）／ miss（扑空刹停）→ 拽 drag → 懵 flinch。
 * 范围：bite 绑命中点，画出的就是咬中的位置；pounce 的尘迹沿施法者实际走过的直线铺开。
 * 运动：速度线沿扑出方向掠过；drag 的碎屑沿 data.direction（目标→施法者）被拽回；flinch 的星子从目标头顶向上飘。
 * 数：`data.morsels`（威力派生）决定咬中迸溅的碎屑数，`data.intensity`（威力 / 62）抬高密度与亮度，
 * `data.drag`（拽回格数）决定 drag 层被拽回的碎屑数，`data.scale`（獠牙判定 / 0.4）放大牙影与判定环。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8A6AA8, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "breathe", bind: "source", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.26, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.05, 0.02],
                    color: 0x6A4E86, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        pounce: {
            duration: 34,
            exit: { stop: 24, drain: 12 },
            emitters: [
                {
                    name: "dust_trail", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "bite_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xD8C6E6, alpha: [0.4, 0], light: "full", maxParticles: 130
                }
            ]
        },
        bite: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
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
                    name: "dark_lash", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "morsels", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8A6AA8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "shreds", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "morsels", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x6A4E86, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        drag: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "reel", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "drag", fallback: 6 }, at: 1 },
                    shape: { kind: "line", length: 0.7 },
                    orient: "direction", direction: "shape",
                    speed: [0.08, 0.26],
                    lifetime: [5, 10], size: [0.07, 0.02], sizeMode: "index",
                    color: 0xC9B6D6, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dazed_stars", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0x8A6AA8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
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

WorldCombatParticles.scene("world_combat:move_bite", 1, BiteDefinition);
