/**
 * 戏法空间 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下荡开一圈靛紫的波纹，撑起一片边界在反向旋转的歪斜空间；谁走进去，
 * 身上就被一缕反向的螺旋拉一下，表示速度被倒转；空间走到尽头，边界向内倒卷收拢。
 *
 * 色相家族：靛紫（0x8A6CFF）为主体，近白紫（0xC3A8FF）做高光，深靛（0x5A3FA8）做地面影与余韵。
 * 一个效果一个色相家族。持续层是贴地的边界环，低密度、低高度，让出目标本体视线。
 * 层次：预张（起手）／边界环＋螺旋（撑开）／贴地边界（持续）／被扭一下（事件）／复原与收。
 * 起击收：windup（聚势）→ open（撑开）→ inside（持续）→ flip（被扭）／unflip（复原）→ 收。
 * 数：撑开与持续的粒子量绑定服务端算出的 data.density；边界半径与地面流动按 data.scale（实际半径）铺开；
 * 入圈双箭头按 data.arrowY 指出推快还是拖慢、箭头长度按 data.magnitude（实际倍率偏差）。
 * 场内：两道贴地的相反流动——向内收（慢的被推快）与向外推（快的被拖慢），让「倒转」在地面直接可读。
 * 入圈：一对上／下箭头按 data.arrowY 指出这次是被推快还是拖慢，箭头长度按 data.magnitude（实际倍率偏差）。
 */
const TrickroomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "coil_gather", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [16, 26], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0xC3A8FF, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        open: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "open_ring", bind: "point", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 40 }, shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.4, 0.18],
                    color: 0xC3A8FF, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "open_spiral", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "density", fallback: 24 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [18, 30], size: [0.28, 0.06], sizeMode: "index",
                    color: 0x8A6CFF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "open_dust", bind: "point", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x5A3FA8, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        inside: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [20, 34], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x8A6CFF, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "edge_motes", bind: "point", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "density", fallback: 24 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [18, 30], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xC3A8FF, alpha: [0.22, 0], light: "full", maxParticles: 30
                },
                {
                    name: "flow_inward", bind: "point", height: 0.03, offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "density", fallback: 24 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.93, spin: 0,
                    lifetime: [14, 24], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xC3A8FF, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "flow_outward", bind: "point", height: 0.03, offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "density", fallback: 24 },
                    shape: { kind: "ring", radius: 3.6 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.93, spin: 0,
                    lifetime: [14, 24], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x5A3FA8, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flip: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "flip_spiral", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC3A8FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "flip_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.13, 0.02], sizeMode: "index",
                    color: 0x8A6CFF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "flip_arrows", bind: "target", fit: "body", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: [0, { data: "arrowY", fallback: 1 }, 0], speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.24, { data: "magnitude", fallback: 0.3 }],
                    color: 0xC3A8FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        unflip: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "unflip_ring", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [14, 24], size: [0.2, 0.05],
                    color: 0x5A3FA8, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trickroom", 1, TrickroomDefinition);
