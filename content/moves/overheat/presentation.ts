/**
 * 过热 / overheat 的客户端表现。
 *
 * 一句话：喉间与胸口聚起白热的光、热气往身前压 → 一整张扇形热浪沿准线推出去，白热核心牵着一片翻卷的火与火星 →
 *   扫到的地方炸开火团、地面留下一块慢慢暗下去的焦痕 → 排空后施法者身上腾起余烟。
 * 色相家族：白热黄（0xFFE8A0）作核心，火橙（0xFF7A2A）作主体，深褐烟（0x3A2E2A）衬托；无第二色相。
 * 拍子：起 gather（聚热）→ 推 wave（扇形热浪）→ 击 blast（命中）与 scorch（焦地）→ 收 slump（余烟）。
 * 范围：wave 的扇面沿 `data.direction` 指向、张角 `data.cone`、长度 `data.reach`，画面就是会被烧到的扇面。
 * 运动：热浪沿准线向外推、火星随热流翻卷上升；焦痕贴地不动。
 * 数：火星数与火团密度绑定 `data.embers`（特攻派生），强度绑定 `data.intensity`（威力 / 120），
 *   焦痕半径绑定 `data.scorch`（机制灼痕半径）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const OverheatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.26, 0.05],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "vent", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.15], spread: 14,
                    lifetime: [5, 11], size: [0.08, 0.01],
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        wave: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "fan", bind: "source", fit: "none", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "embers", fallback: 22 } },
                    shape: { kind: "cone_volume", radius: 0.5, length: { data: "reach", fallback: 8 }, angleDegrees: { data: "cone", fallback: 22 } },
                    orient: "direction", direction: "shape", speed: [0.6, 1.7], spread: 6,
                    gravity: -0.01, drag: 0.97,
                    lifetime: [8, 16], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 150
                },
                {
                    name: "sparks", bind: "source", fit: "none", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 22 } },
                    shape: { kind: "cone_volume", radius: 0.4, length: { data: "reach", fallback: 8 }, angleDegrees: { data: "cone", fallback: 22 } },
                    orient: "direction", direction: "shape", speed: [0.8, 2.0], spread: 8,
                    gravity: 0.01, drag: 0.96,
                    lifetime: [8, 18], size: [0.16, 0.02],
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 160
                }
            ]
        },
        blast: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.32], spread: 20,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "curl", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.05, 0.2], spread: 18, gravity: -0.012, drag: 0.94,
                    lifetime: [10, 20], size: [0.24, 0.04],
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        scorch: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1 },
                    shape: { kind: "point" },
                    direction: "up", speed: [0, 0],
                    lifetime: [40, 90], size: { data: "scorch", fallback: 1.1 },
                    color: 0x5A2A18, alpha: [0.85, 0], light: "world", maxParticles: 2
                },
                {
                    name: "ash", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "embers", fallback: 18 } },
                    shape: { kind: "circle", radius: { data: "scorch", fallback: 1.1 } },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 26], size: [0.28, 0.5],
                    color: 0x3A2E2A, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slump: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.06], drag: 0.92,
                    lifetime: [14, 24], size: [0.24, 0.42],
                    color: 0x8A6A52, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_overheat", 1, OverheatDefinition);
