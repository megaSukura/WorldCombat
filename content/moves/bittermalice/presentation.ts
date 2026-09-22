/**
 * 冤冤相报 / bittermalice 的客户端表现。
 *
 * 一句话：施法者脚边与胸口汇起暗紫怨念 → 怨念化作一只手循着目标飞过去，拖出一缕残念 → 一把攥住目标，
 *   从它身上炸开幽绿怨火、落下几道攥握的光，把它的力气按下去（攻击下降）。
 * 色相家族：幽灵的暗紫（0x8A6BE0 主体、0xC9A8F0 亮面）配幽绿（0x8FE0A8 强调），余韵用近黑紫。
 * 拍子：聚 seethe 0–8t ／ 飞 reach ／ 攥 grasp ／ 空 miss。
 * 范围：seethe 与 grasp 绑各自锚点，尺寸按 `data.scale`（判定半径 / 0.45）缩放；grasp 画出的那圈就是攥中的位置。
 * 运动：seethe 的怨念绕身向内收；reach 的残念沿投射物轨迹拖尾；grasp 的怨火从目标表面外炸、攥光向内收。
 * 数：`data.motes`（特攻与等级派生的怨念数）驱动 seethe／reach／grasp 发射量，`data.stages`（掉攻级数）决定
 *   grasp 的压环重放，`data.consumed`（怨念式是否吞掉异常）追加更亮的幽绿环，`data.intensity`（威力 / 66）抬高密度。
 */
const BitterMaliceSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        seethe: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 22, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.16], spin: 10,
                    lifetime: [8, 14], size: [0.24, 0.06], sizeMode: "sin",
                    color: 0x8A6BE0, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "orb", bind: "source", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "motes", fallback: 16 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.08, 0.24], spin: 14,
                    lifetime: [7, 13], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xC9A8F0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        reach: {
            duration: 120,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", offset: [0, 0.0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 40, trail: { minDistance: 0.35 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.02, 0.08], spin: 12,
                    lifetime: [5, 10], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x8A6BE0, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "motes", bind: "projectile", offset: [0, 0.0, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 16 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "velocity", speed: [0.04, 0.18], spread: 26,
                    lifetime: [5, 11], size: [0.08, 0.01],
                    color: 0xC9A8F0, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        grasp: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "motes", fallback: 16 }, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xffffff, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "grip", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.08, 0.24], spin: 8,
                    lifetime: [8, 14], size: [0.4, 0.1],
                    color: 0x8A6BE0, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "press", bind: "target", offset: [0, 0.12, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.12, 0.3],
                    lifetime: [9, 16], size: [0.4, 0.88], sizeMode: "sin",
                    color: 0x8FE0A8, alpha: [0.55, 0], light: "full", maxParticles: 18
                },
                {
                    name: "devour", bind: "target", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "consumed", fallback: 0 }, interval: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.16, 0.4],
                    lifetime: [9, 16], size: [0.14, 0.02],
                    color: 0x8FE0A8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.02,
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x8A6BE0, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bittermalice", 1, BitterMaliceSceneDefinition);
