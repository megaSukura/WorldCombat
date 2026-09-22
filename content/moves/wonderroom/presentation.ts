/**
 * 奇妙空间 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下荡开一圈淡青的交换波纹，撑起一片两半边反向旋转的空间；谁走进去，
 * 身上被两股反向的粒子一拉，防御与特防当场对调；空间走到尽头，两半边同时归位。
 *
 * 色相家族：交换青（0x8FE8D8）为主体，近白（0xD8FFF4）做高光，青灰（0x5FBFAE）做地面影与余韵。
 * 一个效果一个色相家族。持续层是贴地的边界环，低密度、低高度，让出目标本体视线。
 * 层次：预转（起手）／边界环＋两半（撑开）／贴地边界（持续）／被换一下（事件）／归位与收。
 * 起击收：windup（聚势）→ open（撑开）→ inside（持续）→ swap（被换）／unswap（换回）→ 收。
 * 数：撑开与持续的粒子量绑定服务端算出的 data.density；边界半径绑定 data.scale（机制半径／定义半径）。
 */
const WonderroomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "turn_a", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "shape", speed: [0.03, 0.08], spin: 12,
                    lifetime: [16, 26], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xD8FFF4, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        open: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "open_ring", bind: "point", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 36 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.36, 0.16],
                    color: 0xD8FFF4, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "open_half_light", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: { data: "density", fallback: 22 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "shape", speed: [0.04, 0.14], drag: 0.9, spin: 16,
                    lifetime: [18, 30], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x8FE8D8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "open_dust", bind: "point", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x5FBFAE, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        inside: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9, spin: -8,
                    lifetime: [20, 34], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x8FE8D8, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "edge_dots", bind: "point", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "density", fallback: 22 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [18, 30], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xD8FFF4, alpha: [0.22, 0], light: "full", maxParticles: 30
                }
            ]
        },
        swap: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "swap_in", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xD8FFF4, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 36
                },
                {
                    name: "swap_out", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x8FE8D8, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        unswap: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "unswap_ring", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [14, 24], size: [0.2, 0.05],
                    color: 0x5FBFAE, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wonderroom", 1, WonderroomDefinition);
