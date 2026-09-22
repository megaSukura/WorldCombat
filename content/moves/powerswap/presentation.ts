/**
 * 力量互换 / powerswap 的客户端表现。
 *
 * 一句话：两道攻势光——暖橙的物理与洋红的力量——沿两人之间那条线交缠着互换位置，各自在对面身上炸开成一圈落定的色环；
 *   交换维持的这段时间里，两人之间一直牵着一根极淡的双色光丝，窗口走完时再沿原路交缠着退回。
 * 色相家族：暖橙 0xFF9A4E（物理攻势）＋洋红 0xE06CC8（特攻攻势）双色，中性近白 0xF6E8DA 只落在落定环与强调点上。
 *   双色同时出现是刻意的：这一招交换的是两样东西，两种颜色必须一起被看见。
 * 拍子：读（read 0–18t，两端读数对齐）→ 换（cross/take 0–34t，两条线反向对流）→ 维持（hum，极淡）→ 归（revert 0–24t）。
 * 范围：cross 与 take 都沿 data.path 的两端顶点铺开（source ↔ target），画面就是两人当前的实际距离。
 * 运动：cross 沿 source→target 流、take 沿 target→source 流，两条线反向同时进行，读起来就是对调；
 *   两端各有一圈按对方色相脉动的落定环，表示「现在你带着他的、他带着你的」。
 * 数：`data.streams`（特攻与体型派生的对流条数）驱动流线的发射量与两端爆发，`data.gap`（双方攻势等级差之和）
 *   驱动强度与落定环大小；差距越大，画面里的对流越密、环越大。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const PowerswapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "align_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "streams", fallback: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xFF9A4E, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "align_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: { data: "streams", fallback: 6 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xE06CC8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        cross: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flow_phys", bind: "path", fit: "none", offset: [0.16, 0.35, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "streams", fallback: 8 },
                    direction: "shape", speed: [0.12, 0.42],
                    lifetime: [6, 12], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xFF9A4E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "flow_spec", bind: "path", fit: "none", offset: [-0.16, 0.35, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "streams", fallback: 8 },
                    direction: "shape", speed: [0.1, 0.36],
                    lifetime: [6, 12], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xE06CC8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "draw_line", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: { data: "streams", fallback: 8 } },
                    direction: "shape", speed: [0.3, 0.7],
                    lifetime: [7, 13], size: [0.2, 0.02], sizeMode: "index",
                    color: 0xF6E8DA, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "settle_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 0.7 } },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0xFF9A4E, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "settle_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "spread", fallback: 0.7 } },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0xE06CC8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        take: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "back_spec", bind: "path", fit: "none", offset: [0.16, 0.35, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "streams", fallback: 8 },
                    direction: "shape", speed: [0.12, 0.42],
                    lifetime: [6, 12], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xE06CC8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "back_phys", bind: "path", fit: "none", offset: [-0.16, 0.35, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "streams", fallback: 8 },
                    direction: "shape", speed: [0.1, 0.36],
                    lifetime: [6, 12], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xFF9A4E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "streams", fallback: 8 }, interval: 5, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.34 }, direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 15], size: [0.08, 0.01], sizeMode: "index",
                    color: 0xF6E8DA, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_phys", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "shape", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xFF9A4E, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "hum_spec", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "shape", speed: [0.004, 0.016],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xE06CC8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        },
        revert: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10, interval: 3, repeats: 3 },
                    direction: "shape", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xF6E8DA, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "dud", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8A6A4A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powerswap", 1, PowerswapDefinition);
