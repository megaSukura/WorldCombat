/**
 * 尖刺加农炮 / spikecannon 的客户端表现。
 *
 * 一句话：施法者扎稳下盘、炮口收拢聚力，随后一发接一发把灰色重钉沿一条笔直的线打出去，
 *   钉穿过目标时金属屑与火星炸开，目标被推得向后一退。
 * 色相家族：钢灰（0xC9CDD6／0xB8BEC9 偏色）＋近白火星（glowingsparkle／minihit）＋一点impact 亮边；低饱和冷调。
 * 拍子：起 brace（聚力装钉）→ 射 volley（一发接一发）→ 贯 pierce（贯穿炸开）。
 * 范围：本招是单体直线贯穿，画面用 `orient: "direction"` 的线状发射器沿炮口方向画出一条贯穿线，
 *   玩家一眼看出「这一条线上会被穿透」；没有地面轮廓。
 * 运动：每枚钉沿准线高速直飞（无追踪、无弧线），命中时在目标身上炸开金属屑，并把目标推离。
 * 数：`data.shots` 让起手读出一梭几发，`data.shards`（物攻换算的碎钉量）绑定命中碎屑量，
 *   `data.pierce`（可贯穿人数）让贯穿线更长更亮，`data.scale`（钉判定 / 0.2）让大个子的钉更粗，
 *   `data.intensity`（单钉威力 / 20）放大整幕，`data.lance` 让穿甲式多一层亮边。
 */
const SpikecannonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 16,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "load", bind: "source", offset: [0, 0.5, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shots", fallback: 3 }, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.22, 0.14, 0.3] },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 11], size: [0.2, 0.04],
                    color: 0xC9CDD6, alpha: [0.9, 0], light: "full", bloom: 0.15, maxParticles: 22
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.5, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 9], size: [0.07, 0.015],
                    color: 0xF0F3F8, alpha: [0.75, 0], light: "full", maxParticles: 22
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "bolt", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.22 }, rate: 34,
                    direction: "velocity", speed: [0.0, 0.02], spin: 3,
                    lifetime: [4, 8], size: [0.2, 0.05],
                    color: 0xC9CDD6, alpha: [0.95, 0], light: "full", bloom: 0.15, maxParticles: 34
                },
                {
                    name: "streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    trail: { minDistance: 0.3 }, rate: 14,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.04, drag: 0.92,
                    lifetime: [5, 10], size: [0.05, 0.015],
                    color: 0xB8BEC9, alpha: [0.5, 0], light: "full", maxParticles: 26
                }
            ]
        },
        pierce: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    lifetime: [4, 9], size: [0.28, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "through", bind: "point", fit: "none", offset: [0, 0.5, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "pierce", fallback: 1 }, at: 0 },
                    shape: { kind: "line", length: 1.8 },
                    direction: "shape", speed: [0.0, 0.04],
                    lifetime: [4, 9], size: [0.5, 0.12],
                    color: 0xDCE1E8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.26], spread: 24, spin: 8,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0xB8BEC9, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spark", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, gravity: 0.1, drag: 0.88,
                    lifetime: [6, 12], size: [0.06, 0.015],
                    color: 0xF0F3F8, alpha: [0.8, 0], light: "full", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spikecannon", 1, SpikecannonDefinition);
