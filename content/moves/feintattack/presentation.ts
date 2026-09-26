/**
 * 出奇一击 / feintattack 的客户端表现。
 *
 * 一句话：施法者的身影暗下去、脚下暗影一收，接着只在对手正面留下一小团暗影替身，
 * 下一瞬已经出现在对手背后，贴着背炸开一记靛色暗拳。
 * 色相家族：靛紫（0x7A5FD0）与近黑（0x241A3A），近白（0xE8E0FF）只给命中核心。
 * 拍子：起（gather 隐影）→ 击（vanish 真正闪灭、decoy 替身、strike 背刺）→ 收（miss 收拳）。
 * 范围：strike 的暗环半径由 `data.scale`（背后落点换算）给出，玩家看出这一拳贴住多大一圈。
 * 运动：gather 的暗屑由外向内轻轻收；vanish 只在真正移动时在旧位置闪灭；strike 沿 `data.path`
 *   （实际落脚点到拳击接触）拉出一条暗线，命中处向外炸开暗拳。
 * 数：`data.power`（拳力）抬高命中亮度与碎屑量，`data.decoy` 决定替身是否出现。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FeintattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "shade", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 10], size: [0.16, 0.04],
                    color: 0x241A3A, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        vanish: {
            duration: 18,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "sink", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.24, 0.05],
                    color: 0x241A3A, alpha: [0.45, 0], light: "world", maxParticles: 26
                },
                {
                    name: "gleam", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [4, 8], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8A78C8, alpha: [0.7, 0], light: "full", maxParticles: 14
                }
            ]
        },
        decoy: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "silhouette", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.3, 0.08], sizeMode: "sin",
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "eyeline", bind: "point", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC8B8FF, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blink_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: 26 },
                    direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [5, 10], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x6B5AA8, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "power", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x7A5FD0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "power", fallback: 14 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.12, 0.34], spread: 24, drag: 0.9,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xE8E0FF, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.7 } },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [9, 14], size: [0.36, 0.14],
                    color: 0x4A3A78, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x3A3050, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_feintattack", 1, FeintattackDefinition);
