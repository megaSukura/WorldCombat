/**
 * 泡影的咏叹调 / sparklingaria 的客户端表现。
 *
 * 一句话：施法者在身前收拢一簇细气泡，随后歌声一起，一圈巨大的水泡从脚边整圈涨开、边涨边碎成细沫；
 * 被圈到的每个敌人身上再炸开一小簇气泡与一片水花；身上有灼伤、被真实洗掉的人在泡沫里亮起一圈向上的
 * 洗涤光泽、火星被泡包着熄灭，只有真的回复了血才再亮起恢复点，冰蓝的音符在身周缓缓上浮。
 * 色相家族：水青与近白（bigbubble / bubble / water_ripple / glowingsparkle_cyan）为主体，音符用低饱和的
 *   青白 note 贴图，不引入第二个色相。
 * 拍子：起（inhale 收泡）→ 爆（burst 整圈涨开、hit 逐人水花、wash 洗净/灭火、heal 真实回复）→ 余（note 音符上浮）。
 * 范围：burst 的水泡圈按 `data.scale`（波及半径 / 4.5）涨到机制半径，玩家一眼看出站在哪会被唱到。
 * 运动：水泡由中心向外整圈涨开；hit 的细沫向外炸开；wash 的泡向内包住目标；heal 的光泽向上抽；note 的音符缓慢上浮。
 * 数：`data.bubbles`（气泡数量参数）决定整圈气泡的发射量，`data.count`（本击威力派生）决定每个受击者的细沫量，
 *   `data.intensity` 抬高亮度；heal 只在 `restored` 为真时由服务端发出，不谎报回血。
 */
const SparklingariaDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 22, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12], spread: 18,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x8FD8F0, alpha: [0.6, 0], light: "world", maxParticles: 46
                },
                {
                    name: "spark", bind: "source", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xBFEFFA, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "bloom", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    rate: { data: "bubbles", fallback: 28 }, shape: { kind: "circle", radius: 4.5, thickness: 1 },
                    direction: "outward", speed: [0.08, 0.3], spread: 10,
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0x9FDCEC, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "foam", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: { data: "bubbles", fallback: 28 }, shape: { kind: "circle", radius: 4.2, thickness: 0.9 },
                    direction: "outward", speed: [0.06, 0.22], spread: 16,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xBFEFFA, alpha: [0.6, 0], light: "world", maxParticles: 160
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "circle", radius: 4.5, thickness: 1 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: [14, 22], size: [0.5, 0.2], sizeMode: "index",
                    color: 0x7FC8E0, alpha: [0.55, 0], light: "world", maxParticles: 12
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "count", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 22,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.13, 0.03],
                    color: 0xBFEFFA, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "count", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        wash: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "wrap", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: 26, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.05, 0.18], spread: 14,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xBFEFFA, alpha: [0.75, 0], light: "world", maxParticles: 50
                },
                {
                    name: "quench", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], spread: 12,
                    lifetime: [7, 12], size: [0.1, 0.01],
                    color: 0x8A6A50, alpha: [0.6, 0], light: "world", maxParticles: 34
                }
            ]
        },
        heal: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shine", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 20, shape: { kind: "cylinder", radius: 0.45, length: 1.2 },
                    direction: "up", speed: [0.05, 0.16], spread: 10,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xD8F6FF, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "clean", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.11, 0.02],
                    color: 0xBFEFFA, alpha: [0.6, 0], light: "world", maxParticles: 46
                }
            ]
        },
        note: {
            duration: 60,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "notes", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 3, shape: { kind: "circle", radius: 2.2, thickness: 1 },
                    direction: "up", speed: [0.03, 0.08], spread: 12,
                    lifetime: [26, 44], size: [0.22, 0.06], spin: 2,
                    color: 0xD8F6FF, alpha: [0.5, 0], light: "full", maxParticles: 18
                },
                {
                    name: "motes", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 6, shape: { kind: "circle", radius: 2.0, thickness: 1 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 30], size: [0.08, 0.01],
                    color: 0x9FDCEC, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sparklingaria", 1, SparklingariaDefinition);
