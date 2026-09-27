/**
 * 影子偷袭 / shadowsneak 的客户端表现。
 *
 * 一句话：施法者脚下的影子先加深翻涌，随后一道低矮的暗影贴着真实地面朝提交方向爬出去，每刻上传正在走的
 *   那一段（亮头 + 短尾）；它踩中第一只敌人时，在那只敌人的**背侧**沿真实几何上挑一刀、炸开一团鬼影。
 *   遇到断崖、实墙或水面，影子在实际末点塌回空处。
 * 色相家族：鬼紫（0x7B4FD0）与近黑（0x241A3A），近白（0xE0D0FF）只给命中核心；没有第二组饱和色。
 * 拍子：起 pool（影子加深）→ 探 crawl（每刻真实子段推进）→ 刺 stab（背侧上挑刃与鬼影）→ 收 fizzle（末点塌回）。
 * 运动：crawl 的暗影沿服务端 `data.path` 的真实地面顶点铺（polyline），头在 `data.point`；path 是已经走过的实际子段，不是未来预判。
 * 数：crawl 暗影密度绑定 `data.shade`（速度与等级换算），尺寸取 `data.scale`（实际判定半径 / 参考半径）；
 *   stab 的鬼影数量绑定 `data.power`（影刃威力换算），刃长与爆破半径绑定 `data.blade`。
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
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "creep", bind: "path", fit: "world", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "shade", fallback: 16 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.005, 0.03], spread: 6,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x2A2140, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "head", bind: "point", fit: "world", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 26, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: [0.09, 0.02],
                    color: 0x9A6AD8, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        stab: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blade", bind: "path", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 4, at: 0 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [7, 12], size: [0.5, 0.12], sizeMode: "index",
                    color: 0x6A44C0, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 6
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
                    name: "shade", bind: "point", fit: "world", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shade", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], spread: 22, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE0D0FF, alpha: [0.9, 0], light: "full", maxParticles: 110
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "collapse", bind: "point", fit: "world", offset: [0, 0.06, 0],
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
