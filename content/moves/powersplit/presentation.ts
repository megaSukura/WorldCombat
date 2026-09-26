/**
 * 力量平分 / powersplit 的客户端表现。
 *
 * 一句话：两人各自的攻势光团按自己底子的大小从两端出发，在中点合成一份共同的平均光，再从中央等量地分回两端；
 *   谁底子越厚，出发的光团越密、越大，回来后两边一样。维持期里两人身上各亮着一圈同样大小的共同刻度光。
 * 色相家族：琥珀 0xFFB060（物理攻势）＋玫瑰 0xFF7FA8（特攻攻势）两色从两端汇向中央，中性近白 0xFFF0DC 落在分回与刻度环上。
 *   两色在中央合为近白，正是「两数取平均」的意思。
 * 拍子：聚（gather 0–20t，两端读数）→ 平（merge 0–36t，两端不等光团向中央汇 → 中点合成 → 等量分回）→ 维持（hum，两端刻度光）→ 归（revert 0–26t）。
 * 范围：merge 的 `out_equal` 沿 data.path 的两端顶点从质心向外铺开，画面就是两人当前的实际距离；两端刻度环各落在本人身上。
 * 运动：`in_self_*` 从施法者按 data.toward 飞向目标、`in_foe_*` 从目标按 data.back 飞向施法者，方向与距离用同一份位置数据；
 *   `out_equal` 从中央质心向两端等量散回。出发端的大小由 data.selfSize / data.foeSize（本次双方底子占比）决定，回来后相等。
 * 数：`data.selfFlow` / `data.foeFlow` 驱动两端出发的发射量，`data.flow` 驱动分回量；`data.gauge` 驱动强度；`data.average` 随载荷提供。
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
                    name: "in_self_atk", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "selfFlow", fallback: 8 },
                    direction: [{ data: "toward.0", fallback: 0 }, { data: "toward.1", fallback: 1 }, { data: "toward.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.26 },
                    lifetime: [10, 16], size: { data: "selfSize", fallback: 0.16 }, sizeMode: "sin",
                    color: 0xFFB060, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "in_self_spa", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "selfFlow", fallback: 8 },
                    direction: [{ data: "toward.0", fallback: 0 }, { data: "toward.1", fallback: 1 }, { data: "toward.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.24 },
                    lifetime: [10, 16], size: { data: "selfSize", fallback: 0.16 }, sizeMode: "sin",
                    color: 0xFF7FA8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "in_foe_atk", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "foeFlow", fallback: 8 },
                    direction: [{ data: "back.0", fallback: 0 }, { data: "back.1", fallback: 1 }, { data: "back.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.26 },
                    lifetime: [10, 16], size: { data: "foeSize", fallback: 0.16 }, sizeMode: "sin",
                    color: 0xFFB060, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "in_foe_spa", bind: "target", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "foeFlow", fallback: 8 },
                    direction: [{ data: "back.0", fallback: 0 }, { data: "back.1", fallback: 1 }, { data: "back.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.24 },
                    lifetime: [10, 16], size: { data: "foeSize", fallback: 0.16 }, sizeMode: "sin",
                    color: 0xFF7FA8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "out_equal", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
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
                    name: "hum_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.4, arcDegrees: 320 },
                    direction: "inward", speed: [0.004, 0.016], spin: 8,
                    lifetime: [20, 32], size: [0.12, 0.01], sizeMode: "sin",
                    color: 0xFFF0DC, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "hum_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.4, arcDegrees: 320 },
                    direction: "inward", speed: [0.004, 0.016], spin: -8,
                    lifetime: [20, 32], size: [0.12, 0.01], sizeMode: "sin",
                    color: 0xFFB060, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
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
