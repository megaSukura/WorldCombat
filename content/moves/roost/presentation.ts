/**
 * 羽栖 / Roost 的粒子语言。
 *
 * 一句话：一只鸟在空中先收翼下坠、脚边气流向下压，落到地面时把羽尘与碎屑吹开一圈，落定后身上一遍遍浮起温热的休息光。
 * 色相家族：蜜蜡奶油 0xE8D9A8 作主体，暖白 0xFFF6E0 作高光与回复，土棕 0xB07A3A／0xB9A472 只作落地尘与余韵。
 * 拍子：起（windup）／坠（descend）／落（land）／栖（perch，持续整段）／疗（heal，每段一次）／起（rise）；身份被清除时走 broken。
 * 范围：作用于自己，绑 source（fit body）：下压环与落尘在脚下铺开，玩家看得出这是一次落地，而不是原地发光。
 * 机制驱动：descend 的羽尘数绑 data.downdraft、下落尺度绑 data.scale；land 的尘与羽数量绑 data.burst（羽尘参数）、
 *   落尘环半径绑 data.radius（羽风范围）；perch 的上升光点速率绑 data.restRate、尺寸绑 data.scale；
 *   heal 每段回复的画面数量绑 data.healed（本段真实回复量）——身量、翼展与实际疗量都直接写进画面。
 * 生命周期：perch 由本次栖息载体拥有（服务端 onEffect），载体到期、被清除或取消时随之一并收，不留残影。
 */
const RoostDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "downdraft", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "downdraft", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 }, direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.28, 0.1],
                    color: 0xD8C48A, alpha: [0.55, 0], light: "world", maxParticles: 26
                },
                {
                    name: "flakes", bind: "source", offset: [0, 0.9, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 6, shape: { kind: "sphere", radius: 0.4 }, direction: "down", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: [0.08, 0.01],
                    color: 0xFFF6E0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        descend: {
            duration: 10,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "fall_feather", bind: "path", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "downdraft", fallback: 10 } },
                    shape: { kind: "polyline" }, direction: "up", speed: [0.02, 0.08], gravity: 0.004, drag: 0.94,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF6E0, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fall_draft", bind: "path", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 6 }, shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0xD8C48A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        land: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "dust", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "burst", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.08, 0.22], drag: 0.9, gravity: 0.02,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xB9A472, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "wing_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.3, 0.66],
                    color: 0xE8D9A8, alpha: [0.6, 0], light: "full", maxParticles: 14
                },
                {
                    name: "flurry", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "burst", fallback: 20 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF6E0, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        perch: {
            emitters: [
                {
                    name: "breath", bind: "source", offset: [0, 0.2, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "restRate", fallback: 10 }, shape: { kind: "sphere", radius: 0.35 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: { data: "scale", fallback: 0.16 },
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", bloom: 0.15, maxParticles: 30
                },
                {
                    name: "pulse", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 8, interval: 8 }, shape: { kind: "ring", radius: 0.55 }, direction: "inward", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.22, 0.06],
                    color: 0xE8D9A8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        heal: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "mend", bind: "source", offset: [0, 0.15, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "healed", fallback: 6 } }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: { data: "scale", fallback: 0.16 },
                    color: 0xFFF6E0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "mend_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3 }, shape: { kind: "ring", radius: 0.5 }, direction: "inward", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.2, 0.05],
                    color: 0xFFF0C0, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        rise: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xFFF6E0, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        broken: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "shatter", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0xB07A3A, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_roost", 1, RoostDefinition);
