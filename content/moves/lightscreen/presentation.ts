/**
 * 光墙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：落点先聚起一圈光晕，随后从同一组四角立起一面有清晰边缘和正反面的柔光竖幕；幕面内不断有光尘和
 * 短线流动，来袭从幕外穿到幕后的实际交点折一下光，附带的火星被滤掉一缕，时长走完时整幕向上散去。
 *
 * 色相家族：暖金 0xFFE9A8 为主体，近白 0xFFF6D8 做幕缘高光，暗金 0xC9A85E 做流光与收尾。
 * 一个效果一个色相家族。持续层沿幕面低密度铺设，让出目标本体视线，也不把幕画成一圈穹顶。
 * 层次：聚光（起手）／四角立幕（张起）／幕缘＋面内流光＋厚幕横带（持续）／真实交点折光（事件）／滤淡（事件）／收。
 * 数：幕缘与流光量绑定服务端算出的 data.motes；厚幕的加强横带量绑定 data.braces；尺度用 data.scale。
 * 几何：幕面只从 field 的实际四角 data.path 出（polyline 边缘 + polygon 稀疏面），每次渲染数据都来自该场地。
 */
const LightScreenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "gather", bind: "point", particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
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
                { name: "rise_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "polyline", closed: true },
                    direction: "up", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [16, 28], size: [0.24, 0.08],
                    color: 0xFFF6D8, alpha: [0.8, 0], light: "full", bloom: 0.18, maxParticles: 70 },
                { name: "rise_sheet", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.08], drag: 0.93,
                    lifetime: [14, 24], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", maxParticles: 60 },
                { name: "rise_brace", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "braces", fallback: 0 } }, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.04, 0.12], drag: 0.9,
                    lifetime: [16, 26], size: [0.3, 0.1],
                    color: 0xC9A85E, alpha: [0.5, 0], light: "world", maxParticles: 30 }
            ]
        },
        hold: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: { data: "motes", fallback: 16 }, shape: { kind: "polyline", closed: true },
                    direction: "up", speed: [0, 0.004],
                    lifetime: [10, 16], size: [0.22, 0.14],
                    color: 0xFFF6D8, alpha: [0.5, 0.15], alphaMode: "sin", light: "full", maxParticles: 52 },
                { name: "fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [14, 24], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xFFE9A8, alpha: [0.24, 0], alphaMode: "sin", light: "full", maxParticles: 60 },
                { name: "brace", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "braces", fallback: 0 }, shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0, 0.006],
                    lifetime: [12, 20], size: [0.26, 0.1],
                    color: 0xC9A85E, alpha: [0.4, 0.08], alphaMode: "sin", light: "world", maxParticles: 28 },
                { name: "speck", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "polyline", closed: true },
                    direction: "up", speed: [0, 0.006],
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xC9A85E, alpha: [0.35, 0], light: "world", maxParticles: 32 }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "fold", bind: "point", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "fold", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [8, 16], size: [0.32, 0.12],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.22, maxParticles: 34 },
                { name: "dim", bind: "point", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "dim", fallback: 14 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xC9A85E, alpha: [0.7, 0], light: "world", maxParticles: 24 }
            ]
        },
        filter: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                { name: "strain", bind: "point", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xC9A85E, alpha: [0.5, 0], light: "world", maxParticles: 20 }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                { name: "lift", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "hemisphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [20, 32], size: [0.14, 0.02],
                    color: 0xC9A85E, alpha: [0.5, 0], light: "world", maxParticles: 34 },
                { name: "ring", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "braces", fallback: 12 } }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0xC9A85E, alpha: [0.3, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lightscreen", 1, LightScreenDefinition);
