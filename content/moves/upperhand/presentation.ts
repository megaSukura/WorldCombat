/**
 * 快手还击 / upperhand 的客户端表现。
 *
 * 一句话：施法者掌心亮起、盯住对手刚抬起的那一手 → 一记掌根贴上去，在对手身上炸开暖金冲击、几只眩晕鸟
 * 转起来（它被按停了）；读不到先制招时只是空拍一下、掌心散去。
 * 色相家族：暖金（0xE0B060）与近白（0xFFF0D0）；金色只出现在掌面与命中核心。
 * 拍子：察 alert（盯住先制意图，提交前）→ 扫 sweep（横扫式扇面，可选）→ 击 strike／wide（命中）→ 空 whiff（读空）。
 * 范围：wide 的扇面用 `data.path`（与判定同一组顶点）填成多边形，横扫覆盖到哪块地一眼可见；
 *   strike／wide 的爆环半径用 `data.scale`（判定半径 / 0.4）给出。
 * 运动：alert 的光由外向内收；sweep 的掌风沿扇面掠过；strike 的碎片由内向外炸，眩晕鸟在目标头顶绕圈。
 * 数：`data.count`（掌根威力派生）决定命中碎片数，`data.power` 抬高亮度；数量与机制里的数一致。
 */
const UpperhandDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        alert: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 6 },
            emitters: [
                {
                    name: "glint", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [4, 8], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE0B060, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "mark", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [4, 7], size: [0.08, 0.02],
                    color: 0xFFF0D0, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 6
                }
            ]
        },
        sweep: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polygon" }, rate: { data: "count", fallback: 60 },
                    direction: "shape", speed: [0.03, 0.12], spread: 16,
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE0B060, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 140
                },
                {
                    name: "rim", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline", closed: true }, rate: { data: "count", fallback: 60 },
                    direction: "shape", speed: [0.07, 0.2],
                    lifetime: [4, 8], size: [0.18, 0.04],
                    color: 0xFFF0D0, alpha: [0.65, 0], light: "full", maxParticles: 120
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "palm", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFD98A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 100
                },
                {
                    name: "fist", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [7, 11], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "reel", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.2, 0.05],
                    color: 0xFFE8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [9, 13], size: [0.36, 0.14],
                    color: 0xC88A3E, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        wide: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "scatter", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFD98A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "reel", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 3, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.18, 0.04],
                    color: 0xFFE8C0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 18
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "empty", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 7 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.18, 0.05],
                    color: 0x9A8860, alpha: [0.45, 0], light: "world", maxParticles: 26
                },
                {
                    name: "fade", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.1, 0.03],
                    color: 0xE0B060, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_upperhand", 1, UpperhandDefinition);
