/**
 * 拦堵的客户端表现。
 *
 * 一句话：一圈深色尖桩从地面顶起、贴身围住自己，撞上来的每一击在入射侧的桩面上爆开暗色冲击，
 * 撞的人被一根短刺从入射侧顶退、防御数值当场下降；量尽时桩环崩成一地碎石。
 * 色相家族：深岩灰蓝为主体（spike / smoke / groundquake），惩罚层用 impact_dark 的原色与琥珀火星强调。
 * 拍子：起（raise 0–14t，贴身尖桩自下而上顶出）→ 击（block 每次拦截、punish 每次扎退）→ 收（shatter 崩解）。
 * 范围：hold 的桩环直接读 `data.reach`（机制桩环半径），紧贴真实身体、不当作额外受击范围；block/punish 由 `data.direction` 决定打在哪一侧。
 * 运动：起手尖桩向上顶出并扬尘；持罩几乎静止，只在被撞击处向内一震；惩罚时从入射侧朝攻击者顶出一束短刺。
 * 数：`data.punishCount`（降防级数 ×8）就是 dark 爆点数量，`data.intensity`（剩余量／初始量）决定亮度，`data.reach` 收紧桩环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ObstructDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "stakes", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 34, shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [10, 20], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x4A5563, alpha: [0.9, 0], gravity: 0.03, drag: 0.92,
                    light: "world", maxParticles: 120
                },
                {
                    name: "puff", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 20, shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.26, 0.06],
                    color: 0x6A7078, alpha: [0.3, 0], light: "world", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 22, shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x7A6E5C, alpha: [0.55, 0], gravity: 0.04, light: "world", maxParticles: 110
                }
            ]
        },
        hold: {
            // 持续状态：深色低密度贴身桩环，紧贴身体，让玩家看清拒马在哪。
            emitters: [
                {
                    name: "stake_ring", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 8, shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "up", speed: [0.0, 0.01], spin: 4,
                    lifetime: [26, 44], size: [0.2, 0.2], sizeMode: "sin",
                    color: 0x59626E, alpha: [0.4, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 30
                },
                {
                    name: "base_ring", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 4, shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [24, 38], size: [0.5, 0.5], sizeMode: "sin",
                    color: 0x3E4652, alpha: [0.22, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 12, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "shock", bind: "target", height: 0.5, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 },
                    shape: { kind: "arc", radius: 0.7, arcDegrees: 150 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.34, 0.1],
                    color: 0x939DAB, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "splinter", bind: "target", height: 0.5, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 22 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.07, 0.24], spin: 26,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x7B8494, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        punish: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "stab", bind: "target", height: 0.45, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "punishCount", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 22 },
                    direction: "shape", speed: [0.12, 0.34], spin: 20,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xC9A15A, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "crumble", bind: "target", height: 0.45, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "sparks", bind: "target", height: 0.45, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 28, gravity: 0.05,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xE8C87A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        shatter: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "break", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 0.7 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [12, 20], size: [0.55, 0.1],
                    color: 0x4A5563, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "fall", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 36 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.05, 0.2], spin: 30,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [14, 26], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x5A6472, alpha: [0.9, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [16, 30], size: [0.3, 0.08],
                    color: 0x6A7078, alpha: [0.3, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_obstruct", 1, ObstructDefinition);
