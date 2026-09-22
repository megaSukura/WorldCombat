/**
 * 飞叶风暴 / leafstorm 的客户端表现。
 *
 * 一句话：身侧的尖叶被风拢成一股、绕身打转 → 风柱沿准线卷出、叶片在飞行轴周围旋卷 → 撞上目标炸开一圈叶刃与碎叶 →
 *   卷叶式在落点留下一团原地打转的叶场，慢慢散尽。
 * 色相家族：草绿（0x8FD14A）与深叶绿（0x5FA83A）为主体，叶背的浅黄（0xD8E8A0）作高光细节，中性尘少量。
 * 拍子：起 gather（拢叶）→ 卷 fly（旋卷前进）→ 割 shred（命中炸开）／空 burst（落地散开）→ 场 whirl（原地复割）。
 * 范围：飞行的叶环半径绑 `data.scale`（风柱半径派生）；whirl 用 `data.radius` 画出叶场真实覆盖的地面圈。
 * 运动：叶片沿飞行轴旋卷前进（trail + ring 旋转），命中向外崩散，叶场的叶片贴地慢速打转。
 * 数：叶片数绑定 `data.blades`（速度与等级派生），强度绑定 `data.intensity`（威力 / 120），
 *   叶场存活绑定 `data.whirlTicks`（机制盘桓时长）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LeafstormDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_in", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 18, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.16], spin: 24,
                    lifetime: [6, 12], size: [0.16, 0.05],
                    color: 0x8FD14A, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_spin", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 30,
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0xD8E8A0, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fly: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "vortex", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    trail: { minDistance: 0.3 }, rate: 34, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2], spread: 12, spin: 30,
                    lifetime: [6, 12], size: [0.2, 0.06], sizeMode: "index",
                    color: 0x8FD14A, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.35 }, rate: 20,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.2, 0.05],
                    color: 0xB9D97A, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        shred: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cut", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "blades", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.04], sizeMode: "index",
                    color: 0x8FD14A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "scatter", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "blades", fallback: 22 } },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.26], spread: 30, gravity: 0.06, drag: 0.9, spin: 26,
                    lifetime: [10, 20], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x5FA83A, alpha: [0.9, 0], light: "world", maxParticles: 130
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "loose", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "blades", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.18], spread: 30, gravity: 0.06, drag: 0.9, spin: 24,
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0x8FD14A, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        whirl: {
            duration: 0,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "field", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 40, shape: { kind: "ring", radius: { data: "radius", fallback: 1.8 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 10, spin: 34,
                    lifetime: [14, 26], size: [0.18, 0.04],
                    color: 0x8FD14A, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "floor", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 }, thickness: 0.7 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x9AB06A, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "keep", bind: "point", fit: "none", offset: [0, 0.24, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "sphere", radius: { data: "radius", fallback: 1.8 }, thickness: 1 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD8E8A0, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leafstorm", 1, LeafstormDefinition);
