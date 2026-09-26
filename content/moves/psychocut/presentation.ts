/**
 * 精神利刃 / psychocut 的客户端表现。
 *
 * 一句话：身前凝出一轮偏紫的月牙，脱手后拖着一道刃尾追向目标；命中处切出一个亮紫的十字，把目标钉在交点，
 * 近旁的敌人被刃风扫出一圈小光，暴击时十字更亮更宽。
 * 色相家族：偏紫（psyring／impact_psychic／glowingsparkle_pink）＋近白刃光（cut／softswipe）＋中性尘（tinydust）。
 * 拍子：起（windup 凝刃）→ 掷（blade 月牙飞行、拖尾）→ 裂（cleave 十字、echo 波及）→ 强调（crit）。
 * 范围：cleave 的 `data.path` 是服务端切出的同一组十字顶点，两条交叉线盖到的位置就是刃风范围。
 * 运动：月牙从身前飞向目标并拐弯，飞行段用 projectile 绑定跟着实体；命中处两道亮线交叉划过，余屑向外散。
 * 数：`data.shards`（物攻换算的刃屑量）绑定命中的量；`data.scale` 让宽刃的十字比窄刃更大；`data.intensity` 决定亮度。
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
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crescent", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 22, shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.32, 0.06], spin: 10,
                    color: 0xC79BF0, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "wake", bind: "projectile", offset: [0, 0, 0],
                    trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 34, shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xEADFFF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 80
                }
            ]
        },
        cleave: {
            duration: 24,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "cross_stroke", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.06, 0.2], spread: 6,
                    lifetime: [5, 10], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xF4E8FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "cross_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.07, 0.24], spread: 26,
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xCB9BF2, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "cross_dust", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A80A0, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        echo: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "echo_stroke", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" }, rate: 28, direction: "shape", speed: [0.04, 0.14], spread: 5,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xD9C0F8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "echo_spark", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 6, at: 0 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xE0C4FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 16
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
                    name: "vital_ring", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" },
                    lifetime: [12, 18], size: [0.8, 0.16],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 6
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
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x8E7BC8, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychocut", 1, PsychocutDefinition);
