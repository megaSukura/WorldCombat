/**
 * 暗影拳 / shadowpunch 的客户端表现。
 *
 * 一句话：施法者脚下的影子先翻涌拉长，随后一道暗影贴着地面窜到对手脚下，从对手自己的影子里立起一只拳，
 * 命中处炸开一团鬼影冲击；地缚时拳抓住对手往回拖出一串拖痕。
 * 色相家族：鬼紫（0x8A5FD0）与近黑（0x241A3A），近白（0xE0D0FF）只给命中核心。
 * 拍子：起（coil 影子翻涌）→ 窜（seep 贴地暗影）→ 击（rise 影子拳升起）／空（fizzle 落回空影子）。
 * 范围：rise 的命中环半径由 `data.scale`（判定半径 / 0.4）给出，玩家看出拳能咬住多大一圈。
 * 运动：seep 沿 `data.path`（施法者→对手）在地面爬行；rise 的拳从对手影子里向上立起，命中处向外炸开。
 * 数：`data.power`（拳力）抬高命中亮度与碎屑量，`data.rise` 决定拳升起的高度，`data.travel` 让爬行时长与机制一致。
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
                    name: "crawl", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.01, 0.06], spread: 8,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "head", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0x8A5FD0, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        rise: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fist_up", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 5, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.08, 0.24],
                    lifetime: [7, 13], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x8A5FD0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
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
