/**
 * 变身 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者掌心展开一面镜子照住对手，一道镜光线把它的形状映回来；接着一层虹彩镜壳从脚到头裹住
 *   施法者——它变成了对手的样子；形态撑住时镜壳低低流动，撑不住时整面壳碎开。
 *
 * 色相家族：镜粉紫（0xE8B4FF）画壳与主光，镜青（0x9BE8FF）画映回的形，虹彩亮片（原色）只做披上那一下的强调，
 *   近白做高光。变身是这组里唯一用虹彩的一招，与模仿的思感青、扮演的暖金一眼可分。
 * 层次：起（windup 镜面展开）／映（read 镜光线从目标映回）／披（shift 镜壳裹身 + 虹彩爆发）／
 *   持续（hold 低密度镜光）／收（revert 自己走完、snap 被硬拆）／落空（fail）。
 * 起击收：windup → read → shift → hold → revert／snap／fail。
 * 数：镜面光点来自 data.motes，形态时长由 data.scale 派生，持续镜光密度随剩余比例 data.surge 变化——
 *   都由服务端算出的机制值驱动。
 */
const TransformDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "windup_lens", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: 1, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: 0.35 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.3, 0.18], sizeMode: "sin",
                    color: 0xE8B4FF, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 12
                },
                {
                    name: "windup_swirl", bind: "source", height: 1.3,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 }, direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        read: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "read_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: { data: "motes", fallback: 10 }, trail: { minDistance: 0.22 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.13],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x9BE8FF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "read_shape", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0x9BE8FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        shift: {
            duration: 46,
            exit: { stop: 20, drain: 32 },
            emitters: [
                {
                    name: "shift_shell", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.75 },
                    direction: "inward", speed: [0.05, 0.15],
                    lifetime: [16, 24], size: [0.24, 0.05],
                    color: 0xE8B4FF, alpha: [0.6, 0], light: "full", maxParticles: 100
                },
                {
                    name: "shift_ring", bind: "target", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.85 }, direction: "inward", speed: [0.08, 0.18], spread: 4,
                    lifetime: [14, 22], size: 0.4,
                    color: 0xD9F3FF, alpha: [0.55, 0], light: "full", maxParticles: 90
                },
                {
                    name: "shift_rainbow", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.12, 0.28], spread: 10,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 160
                }
            ]
        },
        hold: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "hold_shell", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.7 }, direction: "inward", speed: [0.02, 0.07],
                    lifetime: [18, 28], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8B4FF, alpha: [0.35, 0], light: "full", maxParticles: 30
                },
                {
                    name: "hold_mirror", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "motes", fallback: 10 }, shape: { kind: "sphere", radius: 0.5 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0x9BE8FF, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        },
        revert: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "revert_shatter", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.22], spread: 20,
                    lifetime: [10, 18], size: [0.1, 0.01],
                    alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "revert_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.5 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [18, 30], size: [0.24, 0.44], color: 0x7A5A8A, alpha: [0.25, 0], light: "world", maxParticles: 30
                }
            ]
        },
        snap: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "snap_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xD8A8E8, alpha: [0.85, 0], light: "full", maxParticles: 34
                },
                {
                    name: "snap_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.1, 0.02], color: 0xE8B4FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fail: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "fail_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.18, 0.32], color: 0x6E7680, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_transform", 1, TransformDefinition);
