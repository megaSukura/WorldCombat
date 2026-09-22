/**
 * 防守互换 / guardswap 的客户端表现。
 *
 * 一句话：两片守势弧——钢蓝的防御与青玉的特防——从两人身上剥离，沿两人之间那条线交缠着换到对面，
 *   各自在对方身上扣成一圈护光；维持期里两弧缓缓反向盘绕，窗口走完时再沿原路交缠着退回。
 * 色相家族：钢蓝 0x6FA8C8（防御）＋青玉 0x6FD0A8（特防）双色，中性近白 0xDCE8F0 只落在扣合环与强调点上。
 * 拍子：读（read 0–18t，两端护弧对齐）→ 换（cross/take 0–34t，两向对流）→ 维持（hum，极淡反向盘绕）→ 归（revert 0–24t）。
 * 范围：cross 与 take 沿 data.path 的两端顶点铺开（source ↔ target），画面就是两人当前的实际距离；两端各有一圈落定护光。
 * 运动：cross 沿 source→target、take 沿 target→source，粒子带横向摆动（deflection）绕成弧线，读起来是两片护壁在对调。
 * 数：`data.threads`（防御与体型派生的光点数量）驱动流线与扣合环，`data.gap`（双方守势等级差之和）驱动强度与护环大小。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const GuardsuwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ward_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.34, arcDegrees: 220 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x6FA8C8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 18
                },
                {
                    name: "ward_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 4, shape: { kind: "ring", radius: 0.34, arcDegrees: 220 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0x6FD0A8, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        cross: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "arc_def", bind: "path", fit: "none", offset: [0.18, 0.4, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "threads", fallback: 6 }, deflection: [0.02, 0.02],
                    direction: "shape", speed: [0.12, 0.4],
                    lifetime: [7, 13], size: [0.16, 0.02], sizeMode: "index",
                    color: 0x6FA8C8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "arc_spd", bind: "path", fit: "none", offset: [-0.18, 0.4, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "threads", fallback: 6 }, deflection: [-0.02, -0.02],
                    direction: "shape", speed: [0.1, 0.34],
                    lifetime: [7, 13], size: [0.15, 0.02], sizeMode: "index",
                    color: 0x6FD0A8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "grind", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "threads", fallback: 6 }, interval: 4, repeats: 3 },
                    direction: "shape", speed: [0.28, 0.64],
                    lifetime: [7, 13], size: [0.14, 0.01], sizeMode: "index",
                    color: 0xDCE8F0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "lock_self", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "spread", fallback: 0.7 } },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0x6FD0A8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "lock_foe", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "spread", fallback: 0.7 } },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0x6FA8C8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        take: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "back_spd", bind: "path", fit: "none", offset: [0.18, 0.4, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "threads", fallback: 6 }, deflection: [0.02, 0.02],
                    direction: "shape", speed: [0.12, 0.4],
                    lifetime: [7, 13], size: [0.16, 0.02], sizeMode: "index",
                    color: 0x6FD0A8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "back_def", bind: "path", fit: "none", offset: [-0.18, 0.4, 0], shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "threads", fallback: 6 }, deflection: [-0.02, -0.02],
                    direction: "shape", speed: [0.1, 0.34],
                    lifetime: [7, 13], size: [0.15, 0.02], sizeMode: "index",
                    color: 0x6FA8C8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "trail", bind: "path", fit: "none", shape: { kind: "polyline", closed: false },
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 6, direction: "shape", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.2, 0.02], sizeMode: "sin",
                    color: 0xDCE8F0, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_self", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.004, 0.016], spin: 8,
                    lifetime: [22, 36], size: [0.14, 0.01], sizeMode: "sin",
                    color: 0x6FA8C8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "hum_foe", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.36, arcDegrees: 300 },
                    direction: "inward", speed: [0.004, 0.016], spin: -8,
                    lifetime: [22, 36], size: [0.14, 0.01], sizeMode: "sin",
                    color: 0x6FD0A8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 14
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
                    color: 0xDCE8F0, alpha: [0.5, 0], light: "full", maxParticles: 40
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

WorldCombatParticles.scene("world_combat:move_guardswap", 1, GuardsuwapDefinition);
