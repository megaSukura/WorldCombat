/**
 * 发劲 / forcepalm 的客户端表现。
 *
 * 一句话：掌心先拢起一层内敛的暖光，上步贴上对手的一刻整圈力环灌进身体、并从背后透出更薄的一圈，
 * 被震到的人身上闪着麻纹。
 * 色相家族：暖白与琥珀（0xFFE0A8 / 0xFFC46B）为主，格斗冲击用原型 impact_fighting，麻纹用 paralysis_spark 的青色。
 * 拍子：起（gather 拢劲）→ 行（step 上步）→ 击（strike 命中）→ 透／麻（through 背后透出、numb 麻纹）→ 落空（miss）。
 * 范围：strike 的力环半径读 `data.scale`（判定半径 / 0.45）；through 用 `data.path`（目标背后那条透劲线）画 polyline。
 * 运动：劲气从掌心向内收、贴上去的一刻向外炸开；透劲沿背后直线铺开；麻纹在命中点向上闪。
 * 数：`data.motes`（物攻与等级换算的劲气量）绑定各处爆发数量与持续发射率，`data.intensity`（motes / 20）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ForcepalmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 16, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFC46B, alpha: [0.55, 0], light: "world", maxParticles: 50
                },
                {
                    name: "focus", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xFFF0C8, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        step: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "dash", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "box", size: [0.4, 0.12, 0.4] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xE8D3A8, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFF0C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "force_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.3, 0.7],
                    color: 0xFFC46B, alpha: [0.65, 0], light: "full", maxParticles: 12
                },
                {
                    name: "palm_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [9, 17], size: [0.07, 0.02],
                    color: 0xD8BE8C, alpha: [0.6, 0], light: "world", maxParticles: 100
                }
            ]
        },
        through: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "exit_line", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/white",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 16 }, direction: "shape", speed: [0.05, 0.22],
                    lifetime: [5, 11], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFFE9C0, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "exit_ring", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    shape: { kind: "polyline" },
                    rate: 22, direction: "shape", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.24, 0.06],
                    color: 0xFFC46B, alpha: [0.55, 0], light: "full", maxParticles: 80
                }
            ]
        },
        numb: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "jolt", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 13], size: [0.14, 0.04],
                    color: 0xBDF0FF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "flicker", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0xC7B08C, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_forcepalm", 1, ForcepalmDefinition);
