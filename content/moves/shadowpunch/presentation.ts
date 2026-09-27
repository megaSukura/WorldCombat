/**
 * 暗影拳 / shadowpunch 的客户端表现。
 *
 * 一句话：施法者脚下的影子先翻涌拉长，随后对手自己脚下的影子聚起一团暗影，从那里立起一只拳升到对手身体，
 *   触及的一刻在命中处炸开一团鬼影冲击；地缚时拳抓住对手往回拖出一串拖痕。
 * 色相家族：鬼紫（0x8A5FD0）与近黑（0x241A3A），近白（0xE0D0FF）只给命中核心。
 * 拍子：起（coil 施法者影子翻涌）→ 凝（seep 对手脚下暗影，无地表长线）→ 升（rise 一只拳从脚影升起）／
 *   击（strike 拳到身体才炸开）／空（fizzle 落回空影子）。
 * 范围：拳只打锁定的单个目标，不做范围判定；`data.rise`（升起高度）决定拳升到哪、命中特效落点，`data.scale`
 *   （判定半径 / 0.4）是拳形尺度；`data.riseTicks`/`data.riseSpeed` 让这只拳在结算同刻恰好升到身体。
 * 运动：seep 的暗影在对手脚下向心聚拢；rise 的拳沿 +Y 升起；strike 在命中处向外炸开。
 * 数：`data.power`（拳力）抬高命中亮度与碎屑量，`data.travel` 让脚下暗影的时长与机制延迟一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShadowpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "sin",
                    color: 0x241A3A, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "stretch", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0x6A4AA8, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        seep: {
            duration: { data: "travel", fallback: 6 },
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "pool", bind: "target", offset: [0, 0.06, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 22, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.11], spread: 8,
                    lifetime: [6, 12], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "head", bind: "target", offset: [0, 0.12, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0x8A5FD0, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        rise: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fist_up", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    direction: "up", speed: { data: "riseSpeed", fallback: 0.12 },
                    lifetime: { data: "riseTicks", fallback: 5 },
                    size: [0.34, 0.06], sizeMode: "index",
                    color: 0x8A5FD0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 6
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, { data: "rise", fallback: 1 }, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "power", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0x9A6AD8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 110
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "power", fallback: 14 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.12, 0.34], spread: 24, drag: 0.9,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xE0D0FF, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.34, 0.14],
                    color: 0x4A3A78, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fall_back", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x3A3050, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shadowpunch", 1, ShadowpunchDefinition);
