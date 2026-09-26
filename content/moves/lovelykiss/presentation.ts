/**
 * 恶魔之吻 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脸前亮起一张恐怖的脸 → 贴地沿直线猛扑过去、身后拖着一串暗红的心 → 贴上对方脸时炸开一团
 *   血色的心与冲击，被吻到的人头顶浮起 Z；扭开的一吻只在它脸侧散成一撮心与烟。
 *
 * 色相家族：暗红（0xB0303A）为主体与扑击、深血红（0x7A1F2A）只压核心，近白（0xFFE0E6）只给高光；
 *   不引入第二色相——「恐怖的脸」与「吻」用同一族深浅区分。
 * 拍子：起 windup（鬼脸）→ 扑 pounce（贴地突进）→ 吻 kiss（脸前爆心）／扭开 miss／免疫 immune；余韵 linger 收拢。
 * 范围：pounce 贴本体，由真实身体移动带出拖尾（不再画一条静态连线）；kiss 在真实接触点爆开。
 * 运动：pounce 的粒子随身体移动带出触地烟与心形拖尾；kiss 的心从目标脸侧向外炸开再上浮。
 * 数：`data.hearts`（体重换算）决定扑击拖尾、落吻与扭开时的心的数量；`data.scale`（判定半径换算）缩放各处粒子尺寸；`data.ringRadius`（剩余睡眠比例换算）决定余韵环大小。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LovelykissDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "grimace", bind: "source", height: 0.86,
                    particle: "world_combat_core:cobblemon/moves/scaryface",
                    rate: 10, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04], spin: 12,
                    lifetime: [8, 14], size: [0.26, 0.12],
                    color: 0xB0303A, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 26
                },
                {
                    name: "eye", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFE0E6, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        pounce: {
            duration: 40,
            exit: { stop: 20, drain: 16 },
            emitters: [
                {
                    // 贴本体：粒子沿身体真实移动带出触地烟，不是画一条线冒充飞行。
                    name: "rush", bind: "source", offset: [0, 0.03, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 40, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    orient: "velocity", direction: "away", speed: [0.02, 0.1], trail: { minDistance: 0.22 },
                    lifetime: [8, 14], size: [0.22, 0.34],
                    color: 0x7A1F2A, alpha: [0.25, 0], light: "world", maxParticles: 90
                },
                {
                    // 身后拖出的一串心：随身体移动沿历史采样，数量由体重换算的 hearts 驱动。
                    name: "trail_heart", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: { data: "hearts", fallback: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "away", speed: [0.02, 0.08], spin: 20, trail: { minDistance: 0.3 },
                    lifetime: [8, 14], size: [0.18, 0.06], sizeMode: "sin",
                    color: 0xB0303A, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        kiss: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "hearts", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.22], drag: 0.93,
                    lifetime: [12, 22], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xB0303A, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "impact", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0x7A1F2A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 32
                },
                {
                    name: "seal", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 28 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.11],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0xFFE0E6, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "twist", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 12 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [10, 16], size: [0.18, 0.05],
                    color: 0xB0303A, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.2, 0.3],
                    color: 0x7A1F2A, alpha: [0.2, 0], light: "world", maxParticles: 20
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.22, 0.06],
                    color: 0xFFE0E6, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "stop", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.18, 0.3],
                    color: 0x7A1F2A, alpha: [0.22, 0], light: "world", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "rest_zzz", bind: "target", offset: [0, 0.35, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xB0303A, alpha: [0.38, 0], light: "full", maxParticles: 14
                },
                {
                    name: "rest_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: { data: "ringRadius", fallback: 0.55 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.2, { data: "ringRadius", fallback: 0.55 }],
                    color: 0x7A1F2A, alpha: [0.28, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lovelykiss", 1, LovelykissDefinition);
