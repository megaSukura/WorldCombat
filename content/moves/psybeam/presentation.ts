/**
 * 幻象光线 / psybeam 的客户端表现。
 *
 * 一句话：施法者瞳里把幻影收成一点紫光 → 一道会拐弯的紫光贴着地面追向目标、拖一层螺旋紫尾 →
 * 追上处炸开一圈打转的紫环；被缠住的人头顶从此盘着飞鸟，每次想反打都被幻影再缠一层。
 * 色相家族：幻紫（0xC77DFF 主 / 0x8A5CFF 暗 / 0xEDD6FF 亮），近白只给命中核心。
 * 拍子：起 gather（瞳里聚幻）→ 追 flight（紫光带螺旋尾）→ 击 hit（紫环与螺旋）→ 果 confuse（飞鸟）
 *   → 反打 punish（幻影再叠一层）→ 续 linger（低密度余韵）。
 * 范围：hit 的紫环半径按 `data.scale`（判定半径 / 0.3）铺开，就是紫光到哪、判定到哪。
 * 运动：flight 绑 projectile 沿追行方向拖螺旋尾；gather 向内收；hit 的螺旋与碎点向外炸。
 * 数：`data.motes`（特攻与等级派生）决定尾迹、命中幻光与余韵的密度，`data.intensity` 抬高亮度。
 */
const PsybeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather_spiral", bind: "source", offset: [0, 0.05, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 20, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xC77DFF, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_glint", bind: "source", offset: [0, 0.05, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 9, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xEDD6FF, alpha: [0.9, 0], light: "full", maxParticles: 22
                }
            ]
        },
        flight: {
            duration: 100,
            exit: { stop: 90, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 28, shape: { kind: "sphere", radius: 0.15 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.24, 0.04],
                    color: 0xC77DFF, alpha: [0.9, 0], light: "full", maxParticles: 34
                },
                {
                    name: "tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: { data: "motes", fallback: 12 },
                    direction: "away", speed: [0.0, 0.05], spread: 24,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9A6AD8, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xC77DFF, alpha: [0.7, 0], light: "full", maxParticles: 6
                },
                {
                    name: "spiral", bind: "point", fit: "none", offset: [0, 0.24, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x8A5CFF, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "glint", bind: "point", fit: "none", offset: [0, 0.24, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xEDD6FF, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF4E6FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        confuse: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "birds", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.22, 0.1], sizeMode: "sin",
                    color: 0xC77DFF, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "wobble", bind: "target", offset: [0, 0.15, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.2, 0.4],
                    color: 0x9A6AD8, alpha: [0.5, 0], light: "full", maxParticles: 8
                }
            ]
        },
        punish: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "jab", bind: "target", offset: [0, 0.05, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xEDD6FF, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 5
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.1, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.16, 0.02],
                    color: 0x5A3B78, alpha: [0.28, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [8, 14], size: [0.18, 0.02],
                    color: 0x8A5CFF, alpha: [0.5, 0], light: "world", maxParticles: 8
                },
                {
                    name: "drift", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9A6AD8, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.3, 0], height: 1.06,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 28], size: [0.18, 0.07], sizeMode: "sin",
                    color: 0xC77DFF, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "linger_orb", bind: "target", offset: [0, 0.12, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xEDD6FF, alpha: [0.32, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psybeam", 1, PsybeamDefinition);
