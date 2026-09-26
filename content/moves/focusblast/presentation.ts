/**
 * 真气弹 / focusblast —— 客户端表现。
 *
 * 一句话：施法者沉身站定、金色气点从四面压向身前凝成一点 → 一团不稳定真气沿准线砸出、拖着硬光线尾 →
 * 命中活物时炸开一圈金白冲击波并把目标推开；飞偏打空只留一下溃散。
 * 色相家族：暖金（0xE8C86A / 0xD9A63A）为主，近白（0xFFF4C8）只给击点，焦褐（0x6A4A1E）做余韵。
 * 拍子：起 charge（蓄势）→ 行 travel（飞行）→ 击 blast（炸开）／空 fizzle。
 * 范围：单发点射，由 travel 的直线轨迹读出；散布见服务端实际飞行方向。
 * 运动：气点 `inward` 压入掌心；气团高速飞出，命中后冲击波向外炸开。
 * 数：blast 的气点数绑定 `data.motes`（特攻与等级换算），强度绑定 `data.intensity`（威力 / 116）。
 */
const FocusBlastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            exit: { drain: 8 },
            emitters: [
                {
                    name: "charge_aura", bind: "source", offset: [0, 0.25, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 26, shape: { kind: "sphere", radius: { data: "jitter", fallback: .5 } },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xE8C86A, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "charge_motes", bind: "source", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 24, shape: { kind: "sphere", radius: { data: "jitter", fallback: .5 } },
                    direction: "inward", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFF4C8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "charge_rings", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, repeats: 4, interval: 5 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.22, 0.46],
                    color: 0xD9A63A, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "bolt_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 46, shape: { kind: "sphere", radius: 0.2 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.34, 0.06],
                    color: 0xE8C86A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "bolt_streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: 30,
                    direction: "away", speed: [0.0, 0.08], spread: 20,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0xFFF4C8, alpha: [0.7, 0], light: "full", maxParticles: 100
                }
            ]
        },
        blast: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "blast_impact", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF4C8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 10
                },
                {
                    name: "blast_ring", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.12, 0.3],
                    lifetime: [10, 18], size: [0.34, 0.8],
                    color: 0xD9A63A, alpha: [0.8, 0], light: "world", maxParticles: 8
                },
                {
                    name: "blast_dust", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.3], spread: 30,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xE8C86A, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "fizzle_smoke", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x6A4A1E, alpha: [0.45, 0], light: "world", maxParticles: 22
                },
                {
                    name: "fizzle_dust", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], spread: 30, gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xD9A63A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_focusblast", 1, FocusBlastDefinition);
