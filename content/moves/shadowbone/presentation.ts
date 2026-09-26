/**
 * 暗影之骨 / shadowbone 的客户端表现。
 *
 * 一句话：身侧浮起骨影与阴气，掷出的骨棒翻转着、拖着一圈幽紫灵魂尾迹飞向目标，命中处炸开一团阴气，真被慑住的
 * 目标头上再冒一层鬼火。
 * 色相家族：幽紫与近黑（impact_ghost／obscuringsmoke 原色、shadowball_impact）＋一处冷白高光（glowingsparkle）。
 * 拍子：起（windup 骨影成形）→ 击（throw 骨棒尾迹 → impact 阴气炸开）→ 收（wail 仅在真的慑防后出现）。
 * 范围：impact 在命中点炸开的团就是骨棒的判定尺度；`data.scale` 与机制里的判定半径同源，骨棒越大炸得越开。
 * 运动：骨棒本体用翻转的物品外观（minecraft:bone）飞行，尾迹沿它的轨迹拖出；阴气从命中点朝外散，鬼火在目标身上慢慢收。
 * 数：`data.notes`（骨棒威力换算）绑定阴气与碎屑数量，`data.scale`（判定半径换算）绑定爆开尺度，
 * `data.stages`（慑防等级）绑定鬼火数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShadowboneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0.4, 0.7, 0.3], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x5A4A7A, alpha: [0.45, 0], light: "world", maxParticles: 30
                },
                {
                    name: "spirit", bind: "source", offset: [0.4, 0.75, 0.3], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 16, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x9A8AC8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 28
                }
            ]
        },
        throw: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "projectile", fit: "none", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    trail: { minDistance: 0.18 },
                    rate: 34, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.18, 0.05],
                    color: 0x4A3A66, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "trail_glow", bind: "projectile", fit: "none", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: 0.28 },
                    rate: 22, shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xB8A8E8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [8, 16], size: [0.4, 0.1], sizeMode: "index",
                    color: 0x8A7AB8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "wisp", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC8B8E8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "ash", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x6A5A8A, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wail: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fright", bind: "target", offset: [0, 0.9, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xB8A8E8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 36
                },
                {
                    name: "fright_spark", bind: "target", offset: [0, 1.0, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "stages", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xD8C8F0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shadowbone", 1, ShadowboneDefinition);
