/**
 * 影子偷袭 / shadowsneak 的客户端表现。
 *
 * 一句话：施法者脚下的影子先加深翻涌，随后一道暗影贴着地面从施法者爬向对手，在对手**背面**立起一刀，
 *   一刀斩下时炸开一团鬼影冲击；裹足式还在地面缠出一圈暗环；目标离场则影子塌回空处。
 * 色相家族：鬼紫（0x7B4FD0）与近黑（0x241A3A），近白（0xE0D0FF）只给命中核心；没有第二组饱和色。
 * 拍子：起 pool（影子加深）→ 窜 crawl（贴地暗影）→ 刺 stab（背刺与鬼影）→ 收 fizzle（落空塌回）。
 * 范围：stab 的鬼影 burst 半径由 `data.blade` 给出，玩家看出这一刀咬住多大一圈；crawl 沿 `data.path` 画出影子爬过的地面。
 * 运动：crawl 从施法者指向对手，速度与机制 `data.seep` 一致（`data.travel` 决定这一拍多长）；stab 的刀锋沿 `data.direction`（对手→施法者）转出。
 * 数：stab 的鬼影数量绑定 `data.power`（影刃威力换算），影屑数量绑定 `data.shade`（速度换算），蓝紫暗环数量绑定 `data.grip`（缚足级数）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShadowsneakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pool: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 1, drain: 8 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "sin",
                    color: 0x241A3A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "gleam", bind: "source", offset: [0, 0.18, 0], height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 6, shape: { kind: "sphere", radius: 0.22 },
                    direction: "down", speed: [0.02, 0.07],
                    lifetime: [5, 9], size: [0.12, 0.02],
                    color: 0x7B4FD0, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        crawl: {
            duration: { data: "travel", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "creep", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.01, 0.05], spread: 6,
                    lifetime: [6, 11], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 80
                },
                {
                    name: "head", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.04, 0.12],
                    lifetime: [5, 9], size: [0.09, 0.02],
                    color: 0x9A6AD8, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        stab: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blade", bind: "point", fit: "none", offset: [0, 0.35, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "line", length: { data: "blade", fallback: 0.4 } },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [7, 12], size: [0.5, 0.12], sizeMode: "index",
                    color: 0x6A44C0, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 4
                },
                {
                    name: "ghost", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "power", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "blade", fallback: 0.4 } },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x8A5FD0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "shade", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shade", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], spread: 22, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE0D0FF, alpha: [0.9, 0], light: "full", maxParticles: 110
                },
                {
                    name: "grip", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "grip", fallback: 0 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.3, 0.12],
                    color: 0x4A3A78, alpha: [0.6, 0], light: "world", maxParticles: 6
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [8, 13], size: [0.18, 0.04],
                    color: 0x3A3050, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shadowsneak", 1, ShadowsneakDefinition);
