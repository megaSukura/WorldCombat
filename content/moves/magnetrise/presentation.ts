/**
 * 电磁飘浮 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：脚下地面被磁化，一圈电弧从地上升起把身体真正托离地面；悬浮期间磁环贴在身体正下方的真实
 * 地表、短电弧顺着真实离地高度连到脚底，落到身上的接触攻击被磁力顶开，贴地的敌人被同极弹走；
 * 磁力耗尽或被切断时电弧收细、身体失托落回。
 *
 * 色相家族：电光黄（0xFFD54A）为主体，近白（0xFFF6D8）做强调电弧，暗黄（0x6B5A12）做脚下影，
 * 被地面招挡下的那一下用白黄闪光。一个效果一个色相家族，第二色相只出现在被弹开的敌人身上（同色更亮）。
 * 层次：聚电（起手，脚底）／起浮环＋上升电弧（身体离地）／地表磁环＋连到脚底的电弧（持续）／
 *       被地面招挡下（目标侧白黄闪）／弹开（敌人侧外放电弧）／收（缓落或失托）。
 * 起击收：gather（聚电）→ lift（离地）→ hover（持续）→ negate／repel（中途事件）→ settle／cut（收）。
 * 数：起浮与电场的粒子量绑定服务端算出的 data.sparks；电场半径绑定 data.field；
 * data.drop 与 data.path 来自当前脚底到真实地表的探针，支撑消失就停画地表磁环与连线；
 * 被弹开的强度（data.power）决定放电弧的爆发量。视觉锚点跟着真实实体脚底／地表，不再额外把粒子抬高。
 */
const MagnetriseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_volt", bind: "source", height: 0.02, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 22, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFFD54A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "gather_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0x6B5A12, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        },
        lift: {
            duration: 40,
            exit: { stop: 14, drain: 28 },
            emitters: [
                {
                    name: "lift_ring", bind: "source", height: 0.02, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 }, shape: { kind: "ring", radius: { data: "field", fallback: 0.7 } },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 18], size: [0.3, 0.14],
                    color: 0xFFD54A, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "lift_arcs", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "sparks", fallback: 20 }, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "lift_shock", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xFFD54A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "lift_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 }, shape: { kind: "ring", radius: { data: "field", fallback: 0.7 } },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0x6B5A12, alpha: [0.45, 0], light: "world", maxParticles: 44
                }
            ]
        },
        hover: {
            exit: { drain: 30 },
            emitters: [
                {
                    // Drop is the currently observed feet-to-support gap, including ceilings and settling.
                    name: "hover_surface", bind: "target", fit: "world", height: 0, offset: [0, { data: "drop", fallback: -0.4 }, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "surfaceRate", fallback: 0 }, shape: { kind: "ring", radius: { data: "field", fallback: 0.7 } },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFD54A, alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 30
                },
                {
                    // 短电弧连接真实地表与脚底：从地面沿身体真实离地高度竖直爬上去。
                    name: "hover_arc", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "arcRate", fallback: 0 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFF6D8, alpha: [0.4, 0], light: "full", maxParticles: 24
                },
                {
                    name: "hover_sparks", bind: "target", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 3, burst: { count: 2, interval: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFF6D8, alpha: [0.34, 0], light: "full", maxParticles: 16
                }
            ]
        },
        negate: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "negate_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.44, 0.08], sizeMode: "index",
                    color: 0xFFF6D8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "negate_ring", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.26, 0.08],
                    color: 0xFFD54A, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        repel: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "repel_arcs", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.42], drag: 0.9,
                    lifetime: [7, 13], size: [0.2, 0.03],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "repel_push", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.34], drag: 0.88,
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0xFFD54A, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "settle_dust", bind: "target", height: 0.02, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 }, shape: { kind: "ring", radius: { data: "field", fallback: 0.7 } },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x6B5A12, alpha: [0.4, 0], light: "world", maxParticles: 44
                },
                {
                    name: "settle_volt", bind: "target", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0xFFD54A, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        cut: {
            duration: 26,
            exit: { stop: 8, drain: 22 },
            emitters: [
                {
                    name: "cut_snap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "cut_dust", bind: "target", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.05, 0.16], gravity: 0.03, drag: 0.92,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x6B5A12, alpha: [0.55, 0], light: "world", maxParticles: 48
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magnetrise", 1, MagnetriseDefinition);
