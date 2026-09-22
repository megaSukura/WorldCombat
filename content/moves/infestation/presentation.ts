/**
 * 死缠烂打 / infestation 的客户端表现。
 *
 * 一句话：一团虫子从施法者身前甩出去、扑到目标身上缠住它，之后虫群贴着目标持续爬动啃咬，直到散去。
 * 色相家族：虫身的黄绿与泥褐（ground_bugs/flying_bugs 原色、impact_bug 亮帧），配一点点酸黄；
 * 与同族三招（白灰冲击、橙红爆炸、翠绿挥弧）在色相上分开。
 * 拍子：起（windup 0–8t 聚虫）→ 击（cast 飞出 → cling 附着）→ 收（bite 每口一次，swarm 持续到 release）。
 * 范围：cling 的附着环绑命中点，半径随 `data.scale`（虫群判定半径 / 0.35）；swarm 的爬行层贴目标身体。
 * 运动：虫子沿投射物方向飞向目标，附着后贴身体绕行爬动；被清掉时向外散去。
 * 数：`data.count`（由每口啃咬比例派生）决定 bite 时炸出的虫数；`data.pulses`（已咬口数）累积提高强度；
 * 缠着期间由 mob_effect_tick 维持低密度的 swarm 画面。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const InfestationDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xA8B83A, alpha: [0.85, 0], light: "world", maxParticles: 100
                }
            ]
        },
        cast: {
            duration: 70,
            exit: { stop: 50, drain: 16 },
            emitters: [
                {
                    name: "swarm_flight", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 50, shape: { kind: "sphere", radius: 0.2 },
                    direction: "shape", speed: [0.02, 0.12], trail: { minDistance: 0.18 },
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x8FA83A, alpha: [0.9, 0], light: "world", maxParticles: 200
                },
                {
                    name: "swarm_dust", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.01, 0.06], trail: { minDistance: 0.24 },
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A7A4A, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        cling: {
            duration: 28,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "attach_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.3, 0.08],
                    color: 0x9AA84A, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "wrap", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC8D060, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        bite: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "nibble", bind: "target", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8F0A0, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "bug_burst", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [9, 16], size: [0.1, 0.03],
                    color: 0x8FA83A, alpha: [0.8, 0], gravity: 0.05, drag: 0.92, light: "world", maxParticles: 120
                }
            ]
        },
        swarm: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "crawl", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 7, shape: { kind: "ring", radius: 0.42 },
                    direction: "shape", speed: [0.01, 0.05], spin: 6,
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0x8FA83A, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 3, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 22], size: [0.14, 0.02],
                    color: 0x6E7A3A, alpha: [0.28, 0], light: "world", maxParticles: 20
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "scatter", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x8FA83A, alpha: [0.7, 0], gravity: 0.04, light: "world", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ground_hit", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A7A4A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "repel", bind: "target", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x6E6A64, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_infestation", 1, InfestationDefinition);
