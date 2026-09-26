/**
 * 火焰拳 / firepunch 的客户端表现。
 *
 * 一句话：拳头缠上一圈火舌、火星顺拳面乱窜，一拳按进目标身上炸开一团火；被点着的人身上腾起持续火苗，
 * 火舌再撑着一缕火花从燃烧部位朝最近一个真正被传火成功的邻敌飞去，落点才腾起新火苗。
 * 色相家族：火橙（0xFF7A2A）与余烬金（0xFFD08A），烟灰作余韵；饱和橙只出现在火苗与火星的小面积。
 * 拍子：起 charge（缠火）→ 击 hit（按进目标）→ 燃 ignite（目标身上起火）→
 *   蔓 spread（火花从燃烧部位沿 `data.direction` 飞过 `data.span` 的距离）与 spread_hit（真正点燃的落点）与 whiff（空拳）。
 * 范围：spread 的飞行用 `data.direction` + 绑 `data.span` 的线段，粒子沿该方向真的移动，不是画一条静止连线；
 *   spread_hit 只在传火真的成功、邻敌实际着火时才在它身上播放。
 * 数：火星数绑 `data.embers`（特攻换算），命中强度绑 `data.intensity`。
 */
const FirepunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "wrap", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 10, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.24, 0.05],
                    color: 0xFF7A2A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.24], spread: 24,
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "embers", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26,
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        ignite: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "body", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        spread: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fly", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "line", length: { data: "span", fallback: 1.5 } },
                    burst: { count: { data: "embers", fallback: 6 }, interval: 1, repeats: 2 },
                    direction: "shape", orient: "direction", speed: [0.22, 0.42], spread: 8,
                    lifetime: [4, 8], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        spread_hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "catch", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "land", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 10], size: [0.1, 0.03], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.7, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 24
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14, interval: 2 },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firepunch", 1, FirepunchDefinition);
