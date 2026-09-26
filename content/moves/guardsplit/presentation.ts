/**
 * 防守平分 / guardsplit 的客户端表现。
 *
 * 一句话：两人各自的护壁光按自己底子的厚度从两端出发，在中点压成同样厚度的一份共同护光，再从中央等量地分回两端；
 *   谁守势越厚，出发的护壁越密、越厚，回来后两边一样厚。维持期里两人身上各亮着一圈同样大小的共同刻度护环。
 * 色相家族：青玉 0x70C8C0（防御）＋石板 0x9AA8C0（特防）两色从两端汇向中央，中性近白 0xE0F0EE 落在分回与护环上。
 *   两色在中央合为近白，正是「两数取平均」的意思。
 * 拍子：聚（gather 0–20t，两端护壁读数）→ 平（merge 0–36t，两端不等护壁向中央压 → 中点合并 → 等量分回）→ 维持（hum，两端护环）→ 归（revert 0–26t）。
 * 范围：merge 的 `out_equal` 沿 data.path 的两端顶点从质心向外铺开，画面就是两人当前的实际距离；两端护环各落在本人身上。
 * 运动：`in_self_*` 从施法者按 data.toward 飞向目标、`in_foe_*` 从目标按 data.back 飞向施法者，方向与距离用同一份位置数据；
 *   `out_equal` 从中央质心向两端等量散回。出发端的厚度由 data.selfSize / data.foeSize（本次双方底子占比）决定，回来后相等。
 * 数：`data.selfFlow` / `data.foeFlow` 驱动两端出发的发射量，`data.flow` 驱动分回量；`data.gauge` 驱动强度；`data.average` 随载荷提供。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const GuardsplitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "read_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "motes", fallback: 4 }, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [9, 15], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 20
                },
                {
                    name: "read_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "motes", fallback: 4 }, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [9, 15], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x9AA8C0, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        merge: {
            duration: 36,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "in_self_def", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "selfFlow", fallback: 8 },
                    direction: [{ data: "toward.0", fallback: 0 }, { data: "toward.1", fallback: 1 }, { data: "toward.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "ring", radius: 0.3, arcDegrees: 300 },
                    lifetime: [10, 16], size: { data: "selfSize", fallback: 0.18 }, sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "in_self_spd", bind: "source", offset: [0, 0.66, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "selfFlow", fallback: 8 },
                    direction: [{ data: "toward.0", fallback: 0 }, { data: "toward.1", fallback: 1 }, { data: "toward.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.24 },
                    lifetime: [10, 16], size: { data: "selfSize", fallback: 0.18 }, sizeMode: "sin",
                    color: 0x9AA8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "in_foe_def", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "foeFlow", fallback: 8 },
                    direction: [{ data: "back.0", fallback: 0 }, { data: "back.1", fallback: 1 }, { data: "back.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "ring", radius: 0.3, arcDegrees: 300 },
                    lifetime: [10, 16], size: { data: "foeSize", fallback: 0.18 }, sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "in_foe_spd", bind: "target", offset: [0, 0.66, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "foeFlow", fallback: 8 },
                    direction: [{ data: "back.0", fallback: 0 }, { data: "back.1", fallback: 1 }, { data: "back.2", fallback: 0 }],
                    speed: { data: "approach", fallback: 0.4 }, shape: { kind: "sphere", radius: 0.24 },
                    lifetime: [10, 16], size: { data: "foeSize", fallback: 0.18 }, sizeMode: "sin",
                    color: 0x9AA8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "out_equal", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "flow", fallback: 12 }, at: 15, interval: 3, repeats: 4 },
                    direction: "outward", speed: [0.12, 0.36],
                    lifetime: [7, 13], size: [0.12, 0.01], sizeMode: "index",
                    color: 0xE0F0EE, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "dome_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 18 }, shape: { kind: "ring", radius: 0.64 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.34, 0.05],
                    color: 0xE0F0EE, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "dome_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 18 }, shape: { kind: "ring", radius: 0.64 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.34, 0.05],
                    color: 0xE0F0EE, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.38, arcDegrees: 320 },
                    direction: "inward", speed: [0.004, 0.016], spin: 8,
                    lifetime: [20, 32], size: [0.12, 0.01], sizeMode: "sin",
                    color: 0xE0F0EE, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "hum_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.38, arcDegrees: 320 },
                    direction: "inward", speed: [0.004, 0.016], spin: -8,
                    lifetime: [20, 32], size: [0.12, 0.01], sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
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
                    color: 0xE0F0EE, alpha: [0.5, 0], light: "full", maxParticles: 40
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
                    color: 0x6A7A8A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_guardsplit", 1, GuardsplitDefinition);
