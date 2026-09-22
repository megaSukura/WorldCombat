/**
 * 近身战 / closecombat 的客户端表现。
 *
 * 一句话：施法者屈膝沉肩、双拳在身前收拢、脚边尘被吸起 → 猛地抢进对手怀里，一串快拳在同一点上连续炸开暖光与碎光
 *   （横扫式时正面还摊开一片扇面）→ 打完重心散掉，身上浮起一层脱力灰气。
 * 色相家族：拳劲的暖橙 0xE8A24A 与近白 0xFFE0B0 为主体，灰褐 0x8C7448 作地面尘与余韵，无第二色相。
 * 拍子：起 ready（扎马收拳）→ 弃守 guard（护罩碎裂）→ 击 hit（每一下砸实）／sweep（横扫扇面）→ 收 slump（脱力）／失 whiff（扑空）。
 * 范围：sweep 的 `face` 绑 `path`、用 `polygon` 填出服务端与判定共用的那片扇形（data.path），画出的面就是要被扫到的范围。
 * 运动：起手拳光向内收，弃守时护罩碎片向外崩开，命中时拳劲与火花从目标向外炸开，横扫的扇面向外流动，脱力灰气缓缓上浮。
 * 数：hit 的拳劲与火花量绑 `data.motes`（物攻派生）、核心尺寸绑 `data.intensity`（威力派生），guard 的碎护罩量绑 `data.guardCracks`（降级派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CloseCombatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "knuckle", bind: "source", offset: [0, 0.6, 0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xFFE0B0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        guard: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "guardCracks", fallback: 8 }, at: 0 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.26], drag: 0.92,
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC24A3A, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wane", bind: "source", offset: [0, 0.9, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "guardCracks", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fist", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [6, 11], size: [0.5, 0.1], sizeMode: "index",
                    alpha: [1, 0], light: "full", maxParticles: 6
                },
                {
                    name: "burst", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 28,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 64
                },
                {
                    name: "spark", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 }, amount: 1,
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE0B0, alpha: [0.9, 0], light: "full", maxParticles: 54
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "face", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 14 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xE8A24A, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 10, at: 0 }, shape: { kind: "line", length: 1.4 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.9,
                    lifetime: [6, 12], size: [0.5, 0.08],
                    color: 0xFFE0B0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        slump: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fatigue", bind: "source", offset: [0, 0.6, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "fatigue", fallback: 18 }, at: 0 },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x9A968C, alpha: [0.5, 0], light: "world", maxParticles: 52
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8C7448, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_closecombat", 1, CloseCombatDefinition);
