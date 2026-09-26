/**
 * 魅惑之声 / disarmingvoice 的客户端表现。
 *
 * 一句话：一声魅惑的鸣叫从身上荡开，音符与心随声波扩到整块声场，罩住的每个目标身上腾起一圈打转的心。
 * 色相家族：樱粉与近白（glowingsparkle_pink、infatuation_heart、note），余韵收在暖白。
 * 拍子：起（charge 聚声）→ 击（wave 声场扩张、hit 命中）→ 收（charmed 心绕着目标慢慢淡去）。
 * 范围：wave 的声场边界环按 `data.radius`（实际声场半径）一次铺到机制半径，向外飞的音符用速度×寿命在整块声场里散开，
 * 玩家看边界环就知道站在哪会被罩住；不做慢慢推进的前缘。
 * 运动：音符与心从身上一次荡出、命中处的心沿目标头顶环绕上升。
 * 数：`data.flow`（半径换算的流量）绑定 wave 的发射率，`data.notes`（威力换算）绑定 hit 的爆发数量，
 * `data.hits`（罩住人数）与 `data.intensity`（威力 / 40）缩放密度与亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const DisarmingvoiceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "inhale", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xF2A0C8, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "breath_notes", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFFE0F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        wave: {
            duration: 34,
            exit: { stop: 20, drain: 16 },
            emitters: [
                {
                    name: "crest", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "flow", fallback: 90 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.22, 0.42], spread: 6,
                    gravity: 0.005, drag: 0.96,
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0xFFE0F0, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 240
                },
                {
                    name: "wave_hearts", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: { data: "flow", fallback: 90 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.2, 0.38], spread: 10,
                    gravity: 0.004, drag: 0.96,
                    lifetime: [10, 16], size: [0.18, 0.05],
                    color: 0xF2A0C8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "plate", bind: "point", fit: "world", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring", spriteFrom: "random",
                    rate: 26, shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [14, 24], size: [0.3, 0.12],
                    color: 0xE890C0, alpha: [0.22, 0], light: "world", render: "translucent", maxParticles: 60
                },
                {
                    name: "edge_ring", bind: "point", fit: "world", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [16, 26], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xF2A0C8, alpha: [0.5, 0], light: "full"
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hit_notes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFFE0F0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "hit_hearts", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "notes", fallback: 8 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0xF2A0C8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "hit_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xF2A0C8, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        charmed: {
            duration: { data: "tick", fallback: 80 },
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "drifting_hearts", bind: "target", offset: [0, 0.95, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 7, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.004, 0.015],
                    lifetime: [22, 40], size: [0.2, 0.08],
                    color: 0xF2A0C8, alpha: [0.65, 0], light: "full", maxParticles: 18
                },
                {
                    name: "soft_glow", bind: "target", offset: [0, 0.85, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 5, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xFFE0F0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_disarmingvoice", 1, DisarmingvoiceDefinition);
