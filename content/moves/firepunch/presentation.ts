/**
 * 火焰拳 / firepunch 的客户端表现。
 *
 * 一句话：拳头缠上一圈火舌、火星顺拳面乱窜，一拳按进目标身上炸开一团火；被点着的人身上腾起持续火苗，
 * 火舌再撑着地面舐向旁边的下一个敌人。
 * 色相家族：火橙（0xFF7A2A）与余烬金（0xFFD08A），烟灰作余韵；饱和橙只出现在火苗与火星的小面积。
 * 拍子：起 charge（缠火）→ 击 hit（按进目标）→ 燃 ignite（目标身上起火）与 spread（火舌蔓延）与 whiff（空拳）。
 * 范围：spread 的蔓延用 `data.path`（命中点 → 邻近目标）画成折线，玩家看出火能舐到哪。
 * 运动：火舌沿拳面朝目标扑出，蔓延的火线沿命中点与邻居之间贴地爬。
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
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" }, burst: { count: { data: "embers", fallback: 6 }, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "resume", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 8, interval: 3 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 30
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
