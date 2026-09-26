/**
 * 和睦相处 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者摊开双手，一圈柔绿的暖点从身侧向外铺开，落到每个看得见的人身上化作一次握手的光；
 *   被劝住的人身上一直亮着一枚握手符，直到这份和睦被己方的攻击打碎——握手断开，只留下已降的攻击小纹。
 *
 * 色相家族：柔绿（0x6FC26F／0x9EE39E）为主体，近白绿（0xEAFBEA）只做落到人身上的那一点高光。
 * 层次：身侧暖点（起手）→ 外扩暖圈＋花瓣点（摊开）→ 握手光（落到人身上）→ 持续握手符（和睦期间）→
 *   断裂散点（破灭）→ 单圈小纹（Boss 只降攻没被劝住）→ 淡尘。
 * 起击收：windup（抬手）→ offer（铺开）→ befriend（落上）→ hold（和睦还在，握手一直亮）→ break（断开）。
 * 数：外扩圈与花瓣点的数量读服务端 data.sparkles，越亲近越暖；圈几何按 3 格参考半径书写，
 *   由服务端 data.scale = 半径 / 3 缩放到真实半径，画的正是机制覆盖的区域。
 */
const PlayniceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "playnice_hands", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [8, 16], size: [0.11, 0.02],
                    color: 0x9EE39E, alpha: [0.6, 0], light: "full", maxParticles: 34
                }
            ]
        },
        offer: {
            duration: 30,
            emitters: [
                {
                    name: "playnice_wave", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "sparkles", fallback: 20 } },
                    shape: { kind: "ring", radius: 3 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.6],
                    color: 0x6FC26F, alpha: [0.55, 0], light: "full", maxParticles: 90
                },
                {
                    name: "playnice_petals", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "sparkles", fallback: 20 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 3 },
                    direction: "up", speed: [0.02, 0.08], spin: 10,
                    lifetime: [16, 26], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0x9EE39E, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        befriend: {
            duration: 26,
            emitters: [
                {
                    name: "playnice_handshake", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparkles", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.12], spread: 25,
                    lifetime: [10, 18], size: [0.17, 0.04], sizeMode: "index",
                    color: 0xEAFBEA, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "playnice_bow", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 26 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [10, 16], size: [0.24, 0.1],
                    color: 0x6FC26F, alpha: [0.5, 0], light: "full", maxParticles: 36
                }
            ]
        },
        hold: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "playnice_clasp_left", bind: "target", offset: [-0.12, 0, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 22], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0x9EE39E, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 10
                },
                {
                    name: "playnice_clasp_right", bind: "target", offset: [0.12, 0, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 22], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0x9EE39E, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 10
                },
                {
                    name: "playnice_seal", bind: "target", height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, shape: { kind: "ring", radius: 0.2 },
                    direction: "inward", speed: [0.0, 0.03],
                    lifetime: [16, 24], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0x6FC26F, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 8
                }
            ]
        },
        break: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "playnice_snap", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.42],
                    color: 0x6FC26F, alpha: [0.7, 0], light: "full", maxParticles: 26
                },
                {
                    name: "playnice_shatter", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.2], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9EE39E, alpha: [0.8, 0], light: "world", maxParticles: 30
                }
            ]
        },
        downdrop: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "playnice_downdrop", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "sparkles", fallback: 12 }, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 0.28, thickness: 0.6 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x6FC26F, alpha: [0.45, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_playnice", 1, PlayniceDefinition);
