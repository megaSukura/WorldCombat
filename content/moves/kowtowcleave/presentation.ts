/**
 * 仆刀 / kowtowcleave 的客户端表现。
 *
 * 一句话：施法者低头跪拜、身上坠下一层暗影，目标身上裂开一道「空门」标记；随后一道暗色刀光从施法者划到目标，
 * 命中处炸开暗色斩击。
 * 色相家族：暗紫与近黑（impact_dark、obscuringsmoke、slash），强调处用一点冷白。
 * 拍子：起（bow 跪拜）→ 示（open 空门标记）→ 击（cleave 刀光与斩击）→ 收（miss 收刀）。
 * 范围：cleave 用 path 画出服务端从施法者到目标的同一组顶点，刀光划到哪、够多宽，画面就是那条线。
 * 运动：暗影从身上坠下，刀光沿 path 从施法者扫到目标，空门标记在目标身上停留到窗口结束。
 * 数：`data.stages`（卸防等级）绑定 open 的标记数量，`data.intensity`（劈砍威力 / 85）抬高刀光与斩击亮度，
 * `data.open`（是否吃到空门）决定斩击是否更亮。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const KowtowcleaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bow: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.24, 0.08],
                    color: 0x3A2C4A, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x7A5AA8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        open: {
            duration: { data: "ticks", fallback: 80 },
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "mark", bind: "target", offset: [0, 0.9, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: { data: "stages", fallback: 1 }, at: 1 },
                    lifetime: [18, 30], size: [0.36, 0.28],
                    color: 0xB89AD8, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "crack", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    rate: 5, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.2, 0.06],
                    color: 0x6A4A8A, alpha: [0.35, 0], light: "full", maxParticles: 14
                }
            ]
        },
        cleave: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "edge", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [6, 12], size: [0.42, 0.08], sizeMode: "index",
                    color: 0x9A7AB8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "edge_spark", bind: "path", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.06, 0.2], spread: 14,
                    lifetime: [5, 11], size: [0.16, 0.03],
                    color: 0xD8C8F0, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "hit", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "notes", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xB89AD8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "hit_dust", bind: "target", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x4A3A5A, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "sheathe", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x7A5AA8, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_kowtowcleave", 1, KowtowcleaveDefinition);
