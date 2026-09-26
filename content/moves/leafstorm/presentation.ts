/**
 * 飞叶风暴 / leafstorm 的客户端表现。
 *
 * 一句话：身侧的尖叶被风拢成一股、绕身打转 → 一根叶筒绕着前进轴旋卷着沿线卷过、真正卷到谁就在谁身上裂开一圈叶刃 →
 *   到射程尽头一次散叶收尾。
 * 色相家族：草绿（0x8FD14A）与深叶绿（0x5FA83A）为主体，叶背的浅黄（0xD8E8A0）作高光细节，中性尘少量。
 * 拍子：起 gather（拢叶）→ 卷 fly（沿准线卷动）→ 割 shred（卷到敌人）→ 收 burst（尽头散叶）。
 * 范围：fly 的叶筒绑真实 projectile（`data.projectile`），筒身沿 `data.direction` 指向；burst 的地面圈用 `data.radius`（风柱半径派生）。
 * 运动：叶片沿真实飞行轨迹旋卷前进（trail + 随速度转向的旋转环），命中向外崩散，尽头落地散开。
 * 数：叶片数绑定 `data.blades`（速度与等级派生），强度绑定 `data.intensity`（威力 / 120）。
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
                    trail: { minDistance: 0.28 }, rate: 36, shape: { kind: "ring", radius: 0.42 },
                    orient: "velocity", direction: "outward", speed: [0.05, 0.2], spread: 12, spin: 30,
                    lifetime: [6, 12], size: [0.2, 0.06], sizeMode: "index",
                    color: 0x8FD14A, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "tube", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    trail: { minDistance: 0.3 }, rate: 22, shape: { kind: "line", length: 0.9 },
                    orient: "velocity", direction: "outward", speed: [0.03, 0.12], spread: 10, spin: 24,
                    lifetime: [5, 11], size: [0.1, 0.02],
                    color: 0xD8E8A0, alpha: [0.7, 0], light: "world", maxParticles: 60
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
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "loose", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "blades", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.22], spread: 32, gravity: 0.06, drag: 0.9, spin: 24,
                    lifetime: [10, 20], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x8FD14A, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "endring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "blades", fallback: 18 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.015],
                    color: 0x9AB06A, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leafstorm", 1, LeafstormDefinition);
