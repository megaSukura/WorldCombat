/**
 * 冰旋 / icespinner 的客户端表现。
 *
 * 一句话：施法者脚下结起薄冰、冰屑开始绕脚打转 → 贴着地面旋转冲出去，冰屑沿路向外甩成两片刀风、脚下拖出冰面 →
 *   撞上目标时炸开一圈冰爆与碎屑。
 * 色相家族：冰青（0x7FD7F0 主 / 0xBEEBF8 亮 / 0xEAF7FC 近白核心），近白只给撞上的一下；无第二个色相。
 * 拍子：起 glaze 0–16t ／ 旋 spin 0–30t ／ 撞 impact 0–28t ／ 定 skid ／ 空 miss。
 * 范围：glaze 与 spin 的贴地环半径绑 `data.scale`（判定半径 / 0.55），玩家一眼看出旋转扫过的那块地方。
 * 运动：glaze 的冰屑绕脚向内收；spin 的冰屑沿 `data.direction` 前抛、贴地旋转；impact 由内向外炸、碎屑受重力落下。
 * 数：`data.shards`（物攻与等级派生的冰屑数）驱动各段发射量，`data.intensity`（旋击威力派生）抬高亮度，
 *   `data.cleared`（刮掉的场地数）在起手与撞上时追加一圈更亮的余环，让「场地被刮掉」这件事看得见。
 */
const IcespinnerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        glaze: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "foot_ring", bind: "source", offset: [0, -0.6, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14], spin: 16,
                    lifetime: [8, 14], size: [0.3, 0.6],
                    color: 0x7FD7F0, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "frost", bind: "source", offset: [0, -0.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.01],
                    color: 0xEAF7FC, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        spin: {
            duration: 30,
            exit: { stop: 20, drain: 16 },
            emitters: [
                {
                    name: "blades", bind: "source", offset: [0, -0.2, 0], height: 0.3, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 18 }, interval: 1, repeats: 4 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.55 } },
                    direction: "shape", speed: [0.1, 0.32], spread: 22,
                    lifetime: [8, 15], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xBFE6F5, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "trail", bind: "source", offset: [0, -0.5, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "shards", fallback: 18 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.1], spread: 18,
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0xD8EEF6, alpha: [0.7, 0], light: "world", maxParticles: 100
                },
                {
                    name: "clear_ring", bind: "source", offset: [0, -0.55, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "cleared", fallback: 0 }, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.55 } },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [10, 16], size: [0.4, 0.9],
                    color: 0x8FE0F5, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34],
                    lifetime: [8, 15], size: [0.42, 0.05], sizeMode: "index",
                    color: 0x9CE0F5, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.16, 0.5], spread: 28, gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x7FD7F0, alpha: [0.95, 0], light: "full", maxParticles: 140
                },
                {
                    name: "ring", bind: "target", offset: [0, -0.4, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.55 } },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [10, 18], size: [0.4, 0.95],
                    color: 0xBEEBF8, alpha: [0.65, 0], light: "world", maxParticles: 6
                }
            ]
        },
        skid: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stop", bind: "source", offset: [0, -0.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.14], gravity: 0.03,
                    lifetime: [10, 20], size: [0.22, 0.04],
                    color: 0xEAF7FC, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slump", bind: "source", offset: [0, -0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xD8EEF6, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icespinner", 1, IcespinnerDefinition);
