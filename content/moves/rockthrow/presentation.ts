/**
 * 落石 / rockthrow 的客户端表现。
 *
 * 一句话：施法者脚边掀起一小撮碎石与尘，随手抄起一块小石；石头贴着身体高度「嗖」地平直飞出，
 *   只在身后留一道极短的尘尾；砸中目标崩出一撮石屑，落到地上只轻轻扬一点灰。
 * 色相家族：现场地表的石灰褐（earth／large_rock／tinydust 原色，按地面材质轻微偏色）＋命中处近白高光。
 * 拍子：起 scoop（掀地抄石）→ 射 release（甩手）→ 飞 flight（一小段尘尾）→ 击 hit（石屑）／落 ground（扬尘）。
 * 范围：本招是单发直线投掷，画面靠 `flight` 那道短尾迹与命中点标出「这一条细线周围会被打到」，没有地面轮廓。
 * 运动：石头本体由原生实体按 item 外观渲染；粒子只补它离手的一下、尾迹与碎裂。
 * 数：`data.shards`（物攻换算的碎屑量）绑定命中崩屑量，`data.scale`（石块判定 / 0.22）统一缩放整幕尺寸，
 *   `data.intensity`（威力 / 40）放大发射量。
 */
const RockthrowDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        scoop: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "uproot", bind: "source", offset: [0, 0.05, 0.25], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 20, shape: { kind: "circle", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.15], gravity: -0.02,
                    lifetime: [6, 11], size: [0.1, 0.03],
                    color: 0xA98C6A, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "choke", bind: "source", offset: [0, 0.1, 0.25], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.04, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.015],
                    alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        release: {
            duration: 8,
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "fling", bind: "source", offset: [0, 0.85, 0.3], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26, drag: 0.9,
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xA98C6A, alpha: [0.6, 0], light: "world", maxParticles: 18
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "stone", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    trail: { minDistance: 0.3 }, rate: 26,
                    direction: "outward", speed: [0.0, 0.03], spin: 5,
                    lifetime: [3, 7], size: [0.2, 0.07],
                    alpha: [0.9, 0], light: "world", maxParticles: 24
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.42 }, rate: 14,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.04, drag: 0.92,
                    lifetime: [5, 10], size: [0.05, 0.02],
                    color: 0xA98C6A, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [4, 8], size: [0.24, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24, spin: 7,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [7, 14], size: [0.18, 0.05],
                    color: 0xA98C6A, alpha: [0.9, 0], light: "world", maxParticles: 34
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9,
                    lifetime: [7, 13], size: [0.05, 0.02],
                    alpha: [0.35, 0], light: "world", maxParticles: 28
                }
            ]
        },
        ground: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "tick", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 5 }, at: 0 },
                    shape: { kind: "circle", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.13], spin: 6,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [7, 13], size: [0.13, 0.04],
                    color: 0xA98C6A, alpha: [0.8, 0], light: "world", maxParticles: 22
                },
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "circle", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 12], size: [0.05, 0.02],
                    alpha: [0.35, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockthrow", 1, RockthrowDefinition);
