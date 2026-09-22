/**
 * 羽毛舞 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者扬起一圈白色绒羽，绒羽团贴着地面飞出，在落点炸开、罩住对手，还在地上摊成一小片
 *   久久不散的绒雾，谁踏进去谁又粘上一层。
 *
 * 色相家族：近白与米白（0xF6F3EA／0xE6E2D6）为主体，暖白高光（0xFFFDF5）只在细节层；没有第二个色相。
 * 层次：聚羽（起手）→ 绒羽团＋飘羽（飞行）→ 落点炸羽＋绒雾圈（铺开）→ 覆身羽（命中）→
 *   贴地绒雾（持续）→ 余羽（覆羽还在）。
 * 起击收：windup（聚拢）→ travel（飞出）→ settle／smother（落下）→ field／linger（还在）。
 * 数：飞行与炸开的绒羽数量由服务端 data.feathers 派生；绒雾圈的半径读 data.radius（判定与画面同半径），
 *   data.scale 让 point 绑定的地环按真实半径铺满。
 */
const FeatherDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            emitters: [
                {
                    name: "plume_gather", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08], spin: 12,
                    lifetime: [12, 20], size: [0.16, 0.04],
                    color: 0xF6F3EA, alpha: [0.8, 0], light: "full", maxParticles: 34
                },
                {
                    name: "plume_glow", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xFFFDF5, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        travel: {
            duration: 20,
            emitters: [
                {
                    name: "plume_wisp", bind: "projectile", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: { data: "feathers", fallback: 24 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.01, 0.05], spin: 10,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xF6F3EA, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "plume_drift", bind: "projectile", height: 0.2, trail: { minDistance: 0.32 },
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf_white",
                    burst: { count: 2, interval: 1, repeats: 14 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.03], spin: 16,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 34,
            emitters: [
                {
                    name: "settle_ring", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.7],
                    color: 0xE6E2D6, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "settle_burst", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "feathers", fallback: 24 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.02, 0.1], spin: 8, gravity: 0.04,
                    lifetime: [16, 30], size: [0.18, 0.05],
                    color: 0xF6F3EA, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "settle_dust", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFFDF5, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        smother: {
            duration: 28,
            emitters: [
                {
                    name: "smother_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "tufts", fallback: 24 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26, spin: 12,
                    lifetime: [9, 16], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xF6F3EA, alpha: [0.95, 0], light: "full", bloom: 0.15, maxParticles: 60
                },
                {
                    name: "smother_cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.1], spin: 10,
                    lifetime: [14, 24], size: [0.16, 0.04],
                    color: 0xE6E2D6, alpha: [0.65, 0], light: "full", maxParticles: 40
                }
            ]
        },
        field: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "field_ring", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.01, 0.04], spin: 4,
                    lifetime: [18, 30], size: [0.24, 0.5],
                    color: 0xE6E2D6, alpha: [0.25, 0], alphaMode: "sin", light: "world", maxParticles: 30
                },
                {
                    name: "field_fluff", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: { data: "feathers", fallback: 24 }, shape: { kind: "circle", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.01, 0.04], spin: 6, gravity: 0.02,
                    lifetime: [22, 40], size: [0.13, 0.02],
                    color: 0xFFFDF5, alpha: [0.22, 0], light: "world", maxParticles: 50
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_plume", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    rate: 4, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03], spin: 8,
                    lifetime: [18, 30], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF6F3EA, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 16
                },
                {
                    name: "linger_dust", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xFFFDF5, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_featherdance", 1, FeatherDanceDefinition);
