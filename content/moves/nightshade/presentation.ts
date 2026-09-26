/**
 * 黑夜魔影 / nightshade 的客户端表现。
 *
 * 一句话：施法者沉入自己拉长的影子，把一段恐怖凝成一颗幽紫的影核掷出；它自己追着目标飞，钻进它心里炸开，
 * 在原地盘踞一小会儿——幻影不碰身体，只在心里留下一片阴冷。
 * 色相家族：幽紫到近黑（smokeorb / impact_ghost / scaryface），强调层用亮紫白光。
 * 拍子：起（charge 凝影）→ 行（flight 追人）→ 击（haunt 钻心）／散（splash 炸影）→ 收（fizzle 落空）。
 * 范围：splash 的地面暗环画的就是炸影半径（data.scale = 实际半径 / 1.7）；haunt 绑命中点。
 * 运动：flight 的幽光钉在幻影本体上，沿它的飞行轨迹拖尾；命中后阴影从命中点向外爆、再缓缓上浮。
 * 数：haunt 与 splash 的幽影数量由服务端按实际伤害与真实波及人数算好传入（data.count）；
 * 被免疫/上限完全挡下时改播 blocked（暗环折返、无钻心爆点），与命中的幽紫钻心分开。
 */
const NightShadeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "shadow_pool", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 14, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [9, 16], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0x2A2238, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fear_mote", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [7, 13], size: [0.15, 0.04], sizeMode: "sin",
                    color: 0x6E5AA8, alpha: [0.7, 0], light: "full", maxParticles: 44
                }
            ]
        },
        flight: {
            duration: 40,
            exit: { stop: 34, drain: 10 },
            emitters: [
                {
                    name: "core", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 30, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.08, 0.03], sizeMode: "sin",
                    color: 0x9A7BFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 26, shape: { kind: "sphere", radius: 0.16 },
                    direction: "shape", speed: [0.01, 0.05], trail: { minDistance: 0.2 },
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x4A3A6E, alpha: [0.55, 0], light: "world", maxParticles: 140
                }
            ]
        },
        haunt: {
            duration: 28,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "mind_break", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "count", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [7, 13], size: [0.34, 0.05],
                    color: 0x9A7BFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "dread", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/scaryface",
                    burst: { count: 3, at: 2 },
                    shape: { kind: "point" }, lifetime: [8, 14], size: [0.42, 0.12],
                    color: 0x6E5AA8, alpha: [0.8, 0], light: "full", maxParticles: 12
                },
                {
                    name: "settle_shade", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.03], sizeMode: "sin",
                    color: 0x241C30, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        splash: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "splash_ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "count", fallback: 18 }, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [9, 15], size: [0.3, 0.1],
                    color: 0x4A3A6E, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "wisp_spread", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "count", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8A6AE0, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x3A3448, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ward_fold", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.26, 0.06],
                    color: 0x5A5468, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "ward_ring", bind: "point", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.2, 0.05],
                    color: 0x4A3A6E, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nightshade", 1, NightShadeDefinition);
