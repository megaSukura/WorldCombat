/**
 * 精神利刃 / psychocut 的客户端表现。
 *
 * 一句话：身前凝出一把偏紫的心刃，脱手后以同一把实形刃拖着薄尾迹追向目标；命中处顺实际入射方向切出一道短痕，
 * 随即散尽；撞墙在墙面断刃。暴击时补一记更亮的刃光。
 * 色相家族：偏紫（psyring1／psyspiral／glowingsparkle_pink）＋近白刃光（cut／softswipe）＋中性尘（tinydust）。
 * 拍子：起（windup 凝刃）→ 掷（blade 心刃飞行、薄尾迹）→ 裂（slash 短切痕 / wall 断刃 / scatter 飞尽散刃）→ 强调（crit）。
 * 范围：slash 的 `data.path` 是服务端切出的同一组端点，整段沿实际入射方向铺开；它就是这一刃真正切到的位置。
 * 运动：心刃从身前飞向目标并拐弯，飞行段用 projectile 绑定跟着实体；命中处一道亮痕划过即散。
 * 数：`data.shards`（物攻换算的刃屑量）绑定命中处的火花量；`data.scale` 让长刃的切痕比短刃更大；`data.intensity` 决定亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PsychocutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0.2], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 14, shape: { kind: "ring", radius: 0.45 }, direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.24, 0.06], spin: 6,
                    color: 0xB57BE8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 26
                },
                {
                    name: "mote", bind: "source", offset: [0, 0.55, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.28 }, direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xE0C4FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        blade: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "edge", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 20, shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.34, 0.06], spin: 10,
                    color: 0xC79BF0, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "wake", bind: "projectile", offset: [0, 0, 0],
                    trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 26, shape: { kind: "sphere", radius: 0.18 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xEADFFF, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        slash: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "slash_stroke", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 46, direction: "shape", speed: [0.06, 0.2], spread: 6,
                    lifetime: [5, 10], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xF4E8FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "slash_spark", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.06, 0.2], spread: 26,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEADFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "slash_dust", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A80A0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "wall_flash", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xCB9BF2, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 36
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A80A0, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        },
        scatter: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "scatter_blade", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xB57BE8, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_edge", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.07, 0.24], spread: 28,
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 40
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.07, 0.24], spread: 28,
                    lifetime: [8, 16], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xF0E0FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychocut", 1, PsychocutDefinition);
