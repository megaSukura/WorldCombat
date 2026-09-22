/**
 * 盐水 / brine 的客户端表现。
 *
 * 一句话：施法者口边先压出一道咸水细线（白汽与水滴往里收）→ 盐卤拖着水尾射出、命中处炸开水花，
 *   残血的目标那一下更亮更大、还迸出咸白的晶屑 → 地上留下一摊缓慢晃动的盐池，浸着踩进来的人。
 * 色相家族：水蓝到近白的咸水族（0x7FD4E8／0xC8ECFF 为主体，0xF2FBFF 只做伤口强调，余韵是中性灰白）。
 * 拍子：起（charge 收水）→ 击（burst 溅开、sting 伤口爆点）→ 收（pool 盐池慢晃）。
 * 范围：盐池按服务端 `data.radius`（真实半径）画，圈到哪就是踩进去会被浇湿的范围。
 * 数：`data.drops`（特攻派生的水滴数）决定溅出的水滴数量，`data.intensity`（命中强度与是否残血）决定明暗，
 *   画面里的数与机制里的数一致。
 */
const BrineDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "intake", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "reach", fallback: 10 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.18],
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0x7FD4E8, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "seep", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xC8ECFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.34], spread: 28, gravity: 0.06, drag: 0.92,
                    lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC8ECFF, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "drops", bind: "point", fit: "none", offset: [0, 0.14, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xF2FBFF, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        sting: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "wound", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.4], spread: 30, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "salt", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "wounded", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        pool: {
            duration: { data: "ticks", fallback: 140 },
            exit: { drain: 30 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 6, shape: { kind: "ring", radius: { data: "radius", fallback: 1.7 } },
                    direction: "outward", speed: [0.006, 0.02],
                    lifetime: [24, 44], size: [0.3, 0.9],
                    color: 0x7FD4E8, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 24
                },
                {
                    name: "shimmer", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 } },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 36], size: [0.06, 0.01],
                    color: 0xE6F7FF, alpha: [0.25, 0], light: "full", maxParticles: 30
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shoes", bind: "target", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.93,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xC8ECFF, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x9FD8EA, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_brine", 1, BrineDefinition);
