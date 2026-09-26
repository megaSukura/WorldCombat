/**
 * 尖刺加农炮 / spikecannon 的客户端表现。
 *
 * 一句话：施法者扎稳下盘、炮口沿一条固定准线收拢聚力，随后一发接一发把灰色重钉沿这条线打出去，
 *   钉穿过目标时金属屑与火星炸开，目标被推得向后一退；撞墙只在原生方块面溅火星，空飞则淡出。
 * 色相家族：钢灰（0xC9CDD6／0xB8BEC9 偏色）＋近白火星（glowingsparkle／minihit）＋一点impact 亮边；低饱和冷调。
 * 拍子：起 brace（聚力装钉、画出固定准线）→ 射 volley（一发接一发，真实投递）→ 贯 pierce（贯穿炸开）／
 *   溅 spark（撞墙／被挡）／ 淡 fade。
 * 范围：本招是固定准线贯穿，画面用 `orient:"direction"` 的线状发射器沿炮口方向画出一条贯穿线，
 *   玩家一眼看出「这一条线上会被穿透」；没有地面轮廓。
 * 运动：每枚钉是服务端 `LivingActions.projectile` 的真投递（`bind:"projectile"`），沿首发固定的准线直飞，
 *   命中在目标身上炸开金属屑；贯穿与顶退都由 `pierce` 幕按实际穿透点依次出现。
 * 数：`data.shots` 让起手读出一梭几发，`data.shards`（物攻换算的碎钉量）绑定命中碎屑量，
 *   `data.pierce`（可贯穿人数）让贯穿线更长更亮，`data.knock`（顶退格数）驱动推离感，
 *   `data.scale`（钉判定 / 0.2）让大个子的钉更粗，`data.intensity`（单钉威力 / 20）放大整幕，
 *   `data.lance` 让穿甲式多一层亮边，`data.span`（真实射程）画出固定准线长度。
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
                },
                {
                    name: "line", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 8, shape: { kind: "line", length: { data: "span", fallback: 6 } },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.34, 0.08],
                    color: 0xB8BEC9, alpha: [0.4, 0], light: "world", maxParticles: 18
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
                    direction: "velocity", speed: [0.01, 0.05],
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
        },
        spark: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "ricochet", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.22], spread: 32, gravity: 0.12, drag: 0.86,
                    lifetime: [5, 10], size: [0.06, 0.015],
                    color: 0xF0F3F8, alpha: [0.75, 0], light: "full", maxParticles: 28
                },
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.1, drag: 0.9,
                    lifetime: [7, 13], size: [0.1, 0.03],
                    color: 0xB8BEC9, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fade: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "thin", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.05, 0.015],
                    color: 0xB8BEC9, alpha: [0.35, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spikecannon", 1, SpikecannonDefinition);
