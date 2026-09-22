/**
 * 迷昏拳 / dizzypunch 的客户端表现。
 *
 * 一句话：双拳按节拍左右交替摆开，一拍一记短促的点打，身前的拳面被一下下打亮；挨打的人身上
 * 迸出拳击冲击，头顶随即按节拍转起星星。
 * 色相家族：暖黄（0xE8B24F）与近白（0xFFF0D0）；饱和只出现在拳面与星星的小面积。
 * 拍子：起 shuffle（踏节拍）→ 打 punch／swing（一拍一记）与 hit（命中）→ 收 daze（星星）与 linger（晕眩存续）。
 * 范围：swing 的小扇面用 `data.path`（施法者→弧点，与判定同一组顶点）填成多边形，玩家一眼看出每拳扫过哪块。
 * 运动：拳面粒子沿 `data.direction` 指向的扇面掠过，左右交替（`data.side` 翻转）；命中的目标向外迸出拳击与星星。
 * 数：swing 的拳面密度由 `data.flows`（拳面张角换算），命中星星数绑定 `data.stars`（拳数与物攻换算），
 *    `data.beat`／`data.beats` 让每一拍的强弱与进度都能从画面读出。
 */
const DizzypunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        shuffle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "bob", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.22, 0.06],
                    color: 0xFFF0D0, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "taps", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xD8C08A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        punch: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ready", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 4, interval: 4, repeats: { data: "beats", fallback: 3 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [6, 11], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        swing: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" }, burst: { count: { data: "flows", fallback: 60 } },
                    direction: "shape", speed: [0.02, 0.1], spread: 16,
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE8B24F, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "fist", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    shape: { kind: "polyline", closed: true }, burst: { count: 8 },
                    direction: "shape", speed: [0.06, 0.2], spread: 10,
                    lifetime: [5, 9], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.05, 0.2], spread: 20,
                    lifetime: [6, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "dizzy", bind: "target", height: 1.08,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "stars", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.16, 0.04],
                    color: 0xE8B24F, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        daze: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "birds", bind: "target", height: 1.12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.2, 0.05],
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xD8C08A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fumble: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "self", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [9, 15], size: [0.16, 0.04],
                    color: 0xE8B24F, alpha: [0.65, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "stars", bind: "target", height: 1.12,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 4, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.15, 0.03],
                    color: 0xE8B24F, alpha: [0.55, 0], light: "full", maxParticles: 18
                },
                {
                    name: "birds", bind: "target", height: 1.16,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [14, 22], size: [0.16, 0.03],
                    color: 0xFFF0D0, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dizzypunch", 1, DizzypunchDefinition);
