/**
 * 火焰拳 / firepunch 的客户端表现。
 *
 * 一句话：拳头缠上一圈火舌、火星顺拳面乱窜，一拳沿当前朝向短伸到真实接触点、在目标身上炸开一团火；被点着的人
 * 身上腾起持续火苗，一条即时的火舌连线从燃烧部位直接舐到最近一个真正被传火成功的邻敌，落点才腾起新火苗。
 * 色相家族：火橙（0xFF7A2A）与余烬金（0xFFD08A），烟灰作余韵；饱和橙只出现在火苗与火星的小面积。
 * 拍子：起 charge（缠火）→ 拳 punch（从身体沿 `data.direction` 短伸 `data.span` 到真实接触点）→
 *   击 hit（按进目标）→ 燃 ignite（目标身上起火）→ 蔓 spread（即时火舌连线，不是飞行火花）与
 *   spread_hit（真正点燃的落点）与 blocked（被墙/身体挡住或原生拒绝）与 whiff（空拳）。
 * 范围：punch/spread 的线段都用 `data.direction` + 绑 `data.span` 的真实跨度，端点就是两张身体/接触点；
 *   spread 把粒子沿整条线出生、几乎不动，读成一条即时的火舌，而不是假装火苗飞过去；
 *   blocked 只在真实被挡或原生拒绝时播放，绝不与 hit 同时出现。
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
        punch: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    // 拳图：从拳头沿真实朝向短伸到接触点；粒子在整段线上出生，端点就是真实接触。
                    name: "reach", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "line", length: { data: "span", fallback: 2.2 } },
                    burst: { count: { data: "embers", fallback: 6 }, interval: 1 },
                    direction: "shape", orient: "direction", speed: [0.03, 0.12], spread: 8,
                    lifetime: [4, 8], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "knuckle", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "sphere", radius: 0.2 },
                    burst: { count: 4, at: 0 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [4, 9], size: [0.1, 0.03], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 16
                }
            ]
        },
        blocked: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spark", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30,
                    lifetime: [4, 9], size: [0.1, 0.03], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.8, 0], gravity: 0.04, drag: 0.92, light: "world", maxParticles: 24
                },
                {
                    name: "smoke", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, interval: 3 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 20
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
                    // 即时火舌：粒子沿「燃烧目标→邻敌」整条线出生、几乎不移动，读成一条清楚的连线。
                    name: "tongue", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "line", length: { data: "span", fallback: 1.5 } },
                    burst: { count: { data: "embers", fallback: 6 }, interval: 1 },
                    direction: "shape", orient: "direction", speed: [0.0, 0.02], spread: 4,
                    lifetime: [5, 9], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "glow", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "line", length: { data: "span", fallback: 1.5 } },
                    burst: { count: 5, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.0, 0.01], spread: 2,
                    lifetime: [4, 7], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 24
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
