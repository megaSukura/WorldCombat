/**
 * 巴投 / circlethrow 的客户端表现。
 *
 * 一句话：施法者压身、双手拢起土褐色的抓握光，一把扣住贴脸的对手，转身把它从自己头顶抡过去——
 *   对手拖着尘迹划出一道抛物线，重重砸在施法者背后，落地炸开一圈土尘。
 * 色相家族：土褐／摔投橙（0xD89A6A 主体、0x8A5A3A 尘）＋淡白（0xF0E0D0）只给抓握与击点高光；没有第二个色相。
 * 拍子：起（windup 拢手）→ 抓（grip 扣住，只播一次）→ 摔（throw 抛物线飞行，位置逐刻更新）→ 落（land 砸地）→ 结果（rout 逐目标）→ 持续（flee 余尘）→ 空（miss 抓空）。
 * 范围：grip／land 的尘土环半径是贴身抓取的那一小圈；飞行段由 target 绑定逐刻跟随被摔者，落点就在施法者背后。
 * 运动：被摔者沿抛物线从头顶掠过、落到来向的反面；尘土从抓点与落点向外炸开。
 * 数：气环与尘环数量由 `data.rings`（物攻派生）驱动；飞行进度用 `data.phase` 让余尘在落地前收细。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CircleThrowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "hands", bind: "source", offset: [0, 0.4, 0.4], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    rate: 12, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.22, 0.04],
                    color: 0xD89A6A, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "circle", radius: 0.6, thickness: 0 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8A5A3A, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        grip: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "clasp", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 3 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.24, 0.04],
                    color: 0xD89A6A, alpha: [0.9, 0], light: "full", maxParticles: 14
                },
                {
                    name: "shock", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 8 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.24], spread: 26,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xD89A6A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 28
                },
                {
                    name: "ring", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "circle", radius: 0.5, thickness: 0 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.5, 0.14],
                    color: 0xF0E0D0, alpha: [0.6, 0], light: "world", maxParticles: 6
                }
            ]
        },
        throw: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "trail", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "rings", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x8A5A3A, alpha: [0.5, 0], light: "world", maxParticles: 120
                },
                {
                    name: "spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 4, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [5, 10], size: [0.2, 0.03],
                    color: 0xD89A6A, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        land: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "slam", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 30,
                    lifetime: [6, 13], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xE8B68A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 34
                },
                {
                    name: "dust", bind: "target", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "rings", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.4, thickness: 0 },
                    direction: "outward", speed: [0.1, 0.36], spread: 12, gravity: 0.03,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8A5A3A, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ground", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "circle", radius: 0.6, thickness: 0 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 16], size: [0.6, 0.18],
                    color: 0xF0E0D0, alpha: [0.55, 0], light: "world", maxParticles: 6
                }
            ]
        },
        rout: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "mark", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.04],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xF0E0D0, alpha: [0.8, 0], light: "full", maxParticles: 3
                }
            ]
        },
        flee: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "dust", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8A5A3A, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "source", offset: [0, 0.35, 0.5], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8A5A3A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_circlethrow", 1, CircleThrowDefinition);
