/**
 * 特性互换 / skillswap 的客户端表现。
 *
 * 一句话：两人身上各浮起一枚紫晶样的特性符 → 两枚符沿着两人之间的连线对穿，各自落到对方的身上并炸开一圈符光 →
 *   此后对调还在的时间里，两人身上各留一层极淡的符光，表示「这个身份是换来的」。
 * 色相家族：超能品红 0xC24AE8 作主体，近白紫 0xF0E6FF 作高光，交换的符缘带一点青白 0x7FE8FF。
 * 拍子：起（trace 0–14t）→ 击（trade 0–28t，对穿与落身）→ 存（hum 持续）→ 收（revert 0–26t）。
 * 范围：trade 的符光沿 `data.path`（施法者与目标两个实体顶点画的 polyline）对穿，画的就是「从多远换来」；
 *   落身与持续光绑各自的身体，fizzle 绑施法者。
 * 运动：符从各自身上升起 → 沿连线对穿到对方 → 落身时向外炸开收束；hum 是极慢的自转。
 * 数：符数与落身粒子数绑 `data.glyphs`（特攻派生），对穿强度绑 `data.intensity`（存续时长派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SkillSwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        trace: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "trace_seal_source", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "glyphs", fallback: 6 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.012, 0.04],
                    lifetime: [9, 15], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xC24AE8, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "trace_seal_target", bind: "target", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "glyphs", fallback: 6 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.012, 0.04],
                    lifetime: [9, 15], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xF0E6FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "trace_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: 6, direction: "shape", speed: [0.02, 0.07], spread: 8,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC24AE8, alpha: [0.55, 0], light: "full", maxParticles: 60
                }
            ]
        },
        trade: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "trade_glyph", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    shape: { kind: "polyline" },
                    rate: { data: "glyphs", fallback: 8 }, direction: "shape", speed: [0.12, 0.3], spread: 5,
                    lifetime: [7, 13], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC24AE8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "trade_flare", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "glyphs", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.07, 0.22], drag: 0.92,
                    lifetime: [9, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF0E6FF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "trade_spiral", bind: "target", fit: "body", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.3, 0.85], sizeMode: "sin",
                    color: 0x7FE8FF, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        hum: {
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "hum_seal", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "glyphs", fallback: 4 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02], spin: 20,
                    lifetime: [14, 24], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xF0E6FF, alpha: [0.34, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "hum_ring", bind: "source", fit: "body", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 2, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 26], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xC24AE8, alpha: [0.26, 0], alphaMode: "sin", light: "world", maxParticles: 18
                }
            ]
        },
        revert: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "revert_ring", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.24, 0.05],
                    color: 0xF0E6FF, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "revert_trail", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xC24AE8, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skillswap", 1, SkillSwapDefinition);
