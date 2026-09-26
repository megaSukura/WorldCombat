/**
 * 神秘守护 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚边升起一圈碧色光尘，光罩合拢成一层护壁罩住它和队友；一条异常状态要落下时，
 * 护壁上荡开一圈光把那条状态弹回去；守护走到尽头，光罩安静收拢。
 *
 * 色相家族：守护碧（0x9FE8B0）为主体，近白（0xE8FBEE）做高光，灰青（0x8FBFA4）做脚下影与淡出。
 * 一个效果一个色相家族。持续层压得很低、放在脚边与身侧，让出目标本体视线。
 * 层次：聚光（起手）／护壁环＋光尘（罩住一圈）／场边稀疏边界＋身周淡环（持续）／
 *       新队友被覆盖时亮一次连线（进入）／弹开一条异常（事件）／某份守护余效走完（lose）／收。
 * 起击收：windup（聚光）→ ward（护壁铺开）→ warded／boundary（持续）→ entry（有人进入）→
 *         guard（弹开一次）→ lose（某人余效走完）→ fade（来源退出）。
 * 数：铺开的守护光点量绑定服务端算出的 data.motes；光罩半径绑定 data.field；
 * 弹开那条异常的爆发量绑定机制里的 motes（由光点数量派生）；进入连线沿 data.path 铺设。
 */
const SafeguardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "ward_gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 7, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xE8FBEE, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        ward: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "ward_ring", bind: "source", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.2 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.34, 0.16],
                    color: 0xE8FBEE, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "ward_motes", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: { data: "motes", fallback: 22 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [18, 30], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x9FE8B0, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "ward_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.2 } },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x8FBFA4, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        warded: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "veil_glow", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 4, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [18, 30], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0x9FE8B0, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 20
                },
                {
                    name: "veil_spark", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 2, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 34], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8FBEE, alpha: [0.22, 0], light: "full", maxParticles: 14
                },
                {
                    name: "veil_ring", bind: "target", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 1.5, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 26], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0x9FE8B0, alpha: [0.22, 0], light: "world", maxParticles: 10
                }
            ]
        },
        boundary: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_dust", bind: "source", height: 0.04, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2.5, shape: { kind: "ring", radius: { data: "field", fallback: 3.2 } },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 26], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0x8FBFA4, alpha: [0.22, 0], light: "world", maxParticles: 26
                },
                {
                    name: "edge_gate", bind: "source", height: 0.0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "ring", radius: { data: "field", fallback: 3.2 } },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [20, 32], size: [0.06, 0.01],
                    color: 0x9FE8B0, alpha: [0.3, 0], light: "world", maxParticles: 32
                }
            ]
        },
        entry: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "entry_link", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x9FE8B0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        guard: {
            duration: 26,
            exit: { stop: 9, drain: 22 },
            emitters: [
                {
                    name: "guard_bounce", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: { data: "motes", fallback: 22 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE8FBEE, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "guard_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0x9FE8B0, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        },
        lose: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "lose_ripple", bind: "target", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0x8FBFA4, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "fade_glow", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [22, 38], size: [0.24, 0.06],
                    color: 0x9FE8B0, alpha: [0.35, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fade_ring", bind: "target", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.2 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0x8FBFA4, alpha: [0.3, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_safeguard", 1, SafeguardDefinition);
