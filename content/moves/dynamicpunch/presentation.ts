/**
 * 爆裂拳 / dynamicpunch 的客户端表现。
 *
 * 一句话：抡圆了全身力气的一记横扫——身前的扇面被速度线整片扫亮，扫中的目标身上炸开赤红的拳击冲击，
 * 头顶随即转起几只混乱的飞鸟。
 * 色相家族：赤红（0xE0523C）与近白（0xF6E3DC）；饱和只出现在冲击与飞鸟的小面积。
 * 拍子：起 windup（后摆蓄力）→ windback（回摆）→ 击 sweep（扇面扫亮）与 impact（命中）→ 收 overextend（挥空失衡）。
 * 范围：sweep 的扇面用 `data.path`（施法者→弧点，与判定同一组顶点）填成多边形，玩家一眼看出站哪会被扫到。
 * 运动：速度线沿 `data.direction` 指向的扇面掠过；命中的目标向外迸碎片；飞鸟在头顶绕圈。
 * 数：`data.path` 的弧点密度由弧角决定，`data.intensity`（威力 / 85）抬高亮度与密度，
 * `data.scale`（拳程 / 2.6）放大拳面与尘环，`data.daze`（混乱刻数）驱动飞鸟的持续。
 */
const DynamicpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.13, 0.04], sizeMode: "sin",
                    color: 0xF6E3DC, alpha: [0.5, 0], light: "full", maxParticles: 20
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC98A6A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 28
                }
            ]
        },
        windback: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "rear", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.16], spread: 14,
                    lifetime: [6, 11], size: [0.18, 0.04],
                    color: 0xF6E3DC, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" }, rate: { data: "flow", fallback: 220 },
                    direction: "shape", speed: [0.03, 0.14], spread: 20,
                    lifetime: [6, 10], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xE86A50, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "rim", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline", closed: true }, rate: { data: "flow", fallback: 220 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [5, 9], size: [0.2, 0.05],
                    color: 0xF6E3DC, alpha: [0.7, 0], light: "full", maxParticles: 200
                },
                {
                    name: "knuckle", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 4 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [7, 11], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 10
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24], spread: 14,
                    lifetime: [7, 13], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.08, 0.2], spread: 8,
                    lifetime: [10, 16], size: [0.34, 0.08],
                    color: 0xE0523C, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "daze_start", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.2, 0.05],
                    color: 0xFFE0D0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        overextend: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "stumble", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [12, 20], size: [0.24, 0.06],
                    color: 0x6E6A64, alpha: [0.32, 0], light: "world", maxParticles: 70
                },
                {
                    name: "offbalance", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.14, 0.04],
                    color: 0xF6E3DC, alpha: [0.7, 0], light: "full", maxParticles: 16
                }
            ]
        },
        fumble: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "self_hit", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "power", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [9, 15], size: [0.16, 0.04],
                    color: 0xE86A50, alpha: [0.65, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "birds", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 5, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.18, 0.04],
                    color: 0xE0523C, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dynamicpunch", 1, DynamicpunchDefinition);
