/**
 * 羽栖 / Roost 的粒子语言。
 *
 * 一句话：一只鸟收翼沉到地面，脚边一股下压的风把羽尘与碎屑吹开一圈，落定后身上一遍遍浮起温热的休息光。
 * 色相家族：蜜蜡奶油 0xE8D9A8 作主体，暖白 0xFFF6E0 作高光与回复，土棕 0xB07A3A／0xB9A472 只作落地尘与余韵。
 * 拍子：起（windup）／落（land）／栖（rest）／起（rise）；身份被清除时走 broken。
 * 范围：作用于自己，绑 source（fit body）：下压环与落尘在脚下铺开，玩家看得出这是一次落地，而不是原地发光。
 * 机制驱动：land 的尘与羽数量绑定 data.burst（羽尘参数），落尘环半径绑定 data.radius（羽风范围）；
 *   rest 的上升光点速率绑定 data.restRate（羽尘数派生）、尺寸绑定 data.scale（羽风范围派生）——身量大、翼展宽的对象落地与栖息画面都更大更密。
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
        rest: {
            duration: 40,
            exit: { stop: 10, drain: 18 },
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
