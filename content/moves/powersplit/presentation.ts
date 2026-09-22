/**
 * 力量平分 / powersplit 的客户端表现。
 *
 * 一句话：两股攻势读数从两人身上同时被抽向中央，在中点合成一个共同的火团，再从中央等量地分回两端；
 *   差得越多，向中央汇的粒子越密、分回的也越均匀；维持期里中央一直亮着一颗共同的刻度光。
 * 色相家族：琥珀 0xFFB060（物理攻势）＋玫瑰 0xFF7FA8（特攻攻势）两色向中央汇合，中性近白 0xFFF0DC 落在分回与强调上。
 *   两色在中央合为近白，正是「两数取平均」的意思。
 * 拍子：聚（gather 0–20t）→ 平（merge 0–36t，向中央汇 → 中点合成 → 分回两端）→ 维持（hum，中央刻度光）→ 归（revert 0–26t）。
 * 范围：merge 沿 data.path 的两端顶点铺开，粒子向路径质心（两人中点）汇聚再反向散回，画面就是这条平分线。
 * 运动：inward 向中央收拢、outward 向两端平分，先收后放；两端各落一圈同样大小的护光，表示「两人现在一样」。
 * 数：`data.flow`（本次数值差与体型、等级派生的粒子数）驱动汇流与分回的发射量，`data.gauge`（差距比例）驱动强度，
 *   `data.average`（这次平到的数值）随载荷提供。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const PowersplitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "read_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 15], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xFFB060, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "read_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [9, 15], size: [0.16, 0.02], sizeMode: "sin",
                    color: 0xFF7FA8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        merge: {
            duration: 36,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "in_phys", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "flow", fallback: 12 }, direction: "inward", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFB060, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "in_spec", bind: "path", fit: "none", offset: [0, 0.12, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "flow", fallback: 12 }, direction: "inward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFF7FA8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "out", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "flow", fallback: 12 }, at: 15, interval: 3, repeats: 4 },
                    direction: "outward", speed: [0.14, 0.4],
                    lifetime: [7, 13], size: [0.12, 0.01], sizeMode: "index",
                    color: 0xFFF0DC, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "settle_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 18 }, shape: { kind: "ring", radius: 0.62 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.32, 0.05],
                    color: 0xFFF0DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "settle_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 18 }, shape: { kind: "ring", radius: 0.62 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.32, 0.05],
                    color: 0xFFF0DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_in", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "inward", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xFFB060, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "hum_out", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "outward", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xFFF0DC, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        },
        revert: {
            duration: 26,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10, interval: 3, repeats: 3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xFFF0DC, alpha: [0.5, 0], light: "full", maxParticles: 40
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

WorldCombatParticles.scene("world_combat:move_powersplit", 1, PowersplitDefinition);
