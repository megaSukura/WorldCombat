/**
 * 光墙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者头顶拢起一圈暖光，光幕像一口柔光穹顶扣在它和队友身上，缓缓流动；特殊攻击穿进来时，
 * 那面幕折一下光、把那一下压暗，附带的火星也被滤掉一缕。
 *
 * 色相家族：暖金 0xFFE9A8 为主体，近白 0xFFF6D8 做幕缘高光，暗金 0xC9A85E 做脚下影与淡出。
 * 一个效果一个色相家族。持续层贴在外圈、低密度，让出目标本体视线；穹顶只画轮廓，不糊住人。
 * 层次：聚光（起手）／穹顶＋幕环（张起）／身周柔光（持续）／折光挡下（事件）／收。
 * 起击收：windup（聚光）→ raise（扣成穹顶）→ hold（持续）→ block（折光压暗）→ fade（收）。
 * 数：幕环与光尘量绑定服务端算出的 data.motes；穹顶半径绑定 data.field；挡下的爆发量读 data.blocked。
 */
const LightScreenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.18, 0.05], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.75, 0], light: "full", bloom: 0.22, maxParticles: 26 }
            ]
        },
        raise: {
            duration: 46,
            exit: { stop: 18, drain: 30 },
            emitters: [
                { name: "dome", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "hemisphere", radius: 0.62 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [18, 30], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.75, 0], light: "full", bloom: 0.22, maxParticles: 80 },
                { name: "veil", bind: "source", height: 0.06, offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.14, 0.24],
                    lifetime: [14, 22], size: [0.42, 0.18],
                    color: 0xFFF6D8, alpha: [0.55, 0], light: "full", bloom: 0.15, maxParticles: 46 },
                { name: "motes", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 24, interval: 4, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.93,
                    lifetime: [16, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xC9A85E, alpha: [0.5, 0], light: "full", maxParticles: 70 }
            ]
        },
        hold: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "target", height: 0.05, offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 0.52 },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [20, 32], size: [0.3, 0.5], sizeMode: "sin",
                    color: 0xFFF6D8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 12 },
                { name: "glow", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 3, shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 32], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 16 }
            ]
        },
        block: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "fold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [8, 16], size: [0.32, 0.12],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.22, maxParticles: 34 },
                { name: "dim", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xC9A85E, alpha: [0.7, 0], light: "world", maxParticles: 24 }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                { name: "lift", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 16 }, shape: { kind: "hemisphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [20, 32], size: [0.14, 0.02],
                    color: 0xC9A85E, alpha: [0.5, 0], light: "world", maxParticles: 34 },
                { name: "ring", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 }, shape: { kind: "ring", radius: { data: "field", fallback: 3 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0xC9A85E, alpha: [0.3, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lightscreen", 1, LightScreenDefinition);
