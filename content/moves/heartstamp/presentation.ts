/**
 * 爱心印章 / heartstamp 的客户端表现。
 *
 * 一句话：施法者抬眼冒出一颗心、飞向目标并在它头顶炸开成粉色心环，同时一圈随实际疏忽窗口收缩的暗纹收拢
 * （目标头上浮出「被萌到了」）→ 施法者贴地扑过去、拖一条粉色残影 → 命中处炸开一圈精神波与碎心，
 * 乘机命中时印章向内闭合、更大更亮，普通碰撞只炸普通精神波 → 被拍懵的人头上晃星。
 * 色相家族：粉与玫红（infatuation_heart / fadeheart_white / glowingsparkle_pink / mediumring）为主体，
 *   精神紫（impact_psychic）只给「击」那一拍。
 * 拍子：起 windup（抬眼）→ 骗 feint（爱心炸开、窗口收缩）→ 行 dash（扑击残影）→ 击 hit/seize（命中）→ 懵 flinch。
 * 范围：dash 沿机制给的位移逐刻铺开，命中 hit/seize 在接触点炸开一圈（点数按 `data.intensity` 派生）。
 * 运动：dash 残影朝向 `orient: velocity` 沿扑击方向；feint 的心向外抛、命中碎心带重力下坠。
 * 数：`data.hearts`（实际疏忽窗口时长派生）决定卖萌心数，`data.charmTicks`（实际挂上的 MobEffect 时长）决定
 *   窗口暗纹的收缩长度，`data.intensity`（实际一击威力派生）决定命中强调与碎心数，`data.scale`（接触判定派生）缩放尺寸。
 */
const HeartStampDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "eyes", bind: "source", offset: [0, 0, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05], spin: 8,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "tease", bind: "source", offset: [0, 0.1, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 5, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.05], spread: 20,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xFF9EC4, alpha: [0.8, 0], light: "world", maxParticles: 16
                }
            ]
        },
        feint: {
            duration: { data: "charmTicks", fallback: 32 },
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hearts", bind: "target", offset: [0, 0.1, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12], spread: 30,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xFF9EC4, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "charm_ring", bind: "target", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 16], size: [0.28, 0.7],
                    color: 0xE68BB4, alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    // 随实际 MobEffect 时长收缩的破绽暗纹：寿命就是这一份疏忽的时间。
                    name: "window", bind: "target", offset: [0, 0.14, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "point" },
                    speed: [0.0, 0.0],
                    lifetime: { data: "charmTicks", fallback: 32 }, size: [0.75, 0.06], sizeMode: "linear",
                    color: 0xE68BB4, alpha: [0.75, 0], light: "full", maxParticles: 4
                },
                {
                    name: "charm_sparkle", bind: "target", offset: [0, 0.4, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 6, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1], spin: 10,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        dash: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0, 0], height: 0.4, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 30, shape: { kind: "sphere", radius: 0.24 },
                    direction: "away", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "wake", bind: "source", offset: [0, 0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xC98BA8, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: 9, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE8C8FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "shockring", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 16], size: [0.28, 0.75],
                    color: 0xE68BB4, alpha: [0.75, 0], light: "full", maxParticles: 4
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.38, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 8, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 30,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0xFF9EC4, alpha: [0.85, 0], light: "world", maxParticles: 34
                }
            ]
        },
        seize: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "seize_impact", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 5, interval: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: 9, size: [0.44, 0.06], sizeMode: "index",
                    color: 0xF2DEFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 12
                },
                {
                    name: "seize_ring", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.0, 0.12],
                    lifetime: [12, 20], size: [1.0, 0.2],
                    color: 0xE68BB4, alpha: [0.8, 0], light: "full", maxParticles: 6
                },
                {
                    name: "seize_hearts", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 12, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 36,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.18, 0.03],
                    color: 0xFF9EC4, alpha: [0.9, 0], light: "world", maxParticles: 44
                },
                {
                    name: "seize_sparkle", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spin: 12,
                    lifetime: [10, 18], size: [0.1, 0.01],
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        flinch: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "scuff", bind: "source", offset: [0, 0, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xC98BA8, alpha: [0.55, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heartstamp", 1, HeartStampDefinition);
