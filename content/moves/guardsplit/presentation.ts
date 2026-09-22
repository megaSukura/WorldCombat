/**
 * 防守平分 / guardsplit 的客户端表现。
 *
 * 一句话：两道护壁从两人身上同时向中央压过来，在中点压成同一块护罩，再等量地分回两端，各扣成一样的护环；
 *   差得越多，向中央压的护壁越密，分回的也越同步；维持期里中央一直亮着一道共同的护罩光。
 * 色相家族：青玉 0x70C8C0（防御）＋石板 0x9AA8C0（特防）两色向中央合拢，中性近白 0xE0F0EE 落在分回与护环上。
 *   两色在中央合为近白，正是「两数取平均」的意思。
 * 拍子：聚（gather 0–20t）→ 平（merge 0–36t，向中央压 → 中点合成 → 分回两端）→ 维持（hum，中央护罩光）→ 归（revert 0–26t）。
 * 范围：merge 沿 data.path 的两端顶点铺开，粒子向路径质心（两人中点）压拢再反向散回，画面就是这条平分线。
 * 运动：inward 向中央压拢、outward 向两端平分，先收后放；两端各落一圈同样大小的护环，表示「两人现在一样厚」。
 * 数：`data.flow`（本次数值差与体型、等级派生的粒子数）驱动压拢与分回的发射量，`data.gauge`（差距比例）驱动强度，
 *   `data.average`（这次平到的数值）随载荷提供。
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
                    rate: 4, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [9, 15], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 20
                },
                {
                    name: "read_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 4, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
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
                    name: "in_def", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "flow", fallback: 12 }, direction: "inward", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.16, 0.02], sizeMode: "index",
                    color: 0x70C8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 110
                },
                {
                    name: "in_spd", bind: "path", fit: "none", offset: [0, 0.12, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "flow", fallback: 12 }, direction: "inward", speed: [0.06, 0.2],
                    lifetime: [6, 12], size: [0.13, 0.02], sizeMode: "index",
                    color: 0x9AA8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 110
                },
                {
                    name: "out", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
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
                    name: "hum_in", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "inward", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0x70C8C0, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "hum_out", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, direction: "outward", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0xE0F0EE, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 16
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
