/**
 * 盐水 / brine 的客户端表现。
 *
 * 一句话：施法者口边先压出一道咸水细线（白汽与水滴往里收）→ 盐卤拖着水尾笔直射出，命中处炸开一簇紧束的水花；
 *   命中前目标已在半血以下时，伤口处迸出成片盐晶与一道裂口 → 打中墙或射空只散开一小滩水。
 * 色相家族：水蓝到近白的咸水族（0x7FD4E8／0xC8ECFF 为主体，0xF2FBFF 只做伤口强调，余韵是中性灰白）。
 * 拍子：起（charge 收水）→ 击（burst 紧束溅开、sting 残血裂口）→ 收（miss 空弹散水）。
 * 范围：判定半径按服务端 `data.scale`（真实 nozzle / 参考半径）缩放，圈到哪就是会被浇湿、被翻倍的范围。
 * 数：`data.drops`（特攻派生的水滴数）决定溅出的水滴数量，`data.shards`（残血时的盐晶数）只在伤口上出现，
 *   `data.intensity`（命中强度与是否残血）决定明暗，画面里的数与机制里的数一致。
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
                    rate: { data: "reach", fallback: 10 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.18],
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0x7FD4E8, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "seep", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xC8ECFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.12, 0.38], spread: 16, gravity: 0.06, drag: 0.9,
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xC8ECFF, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "drops", bind: "point", fit: "none", offset: [0, 0.14, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "drops", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.09, 0.02],
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
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "shards", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.16, 0.42], spread: 18,
                    lifetime: [7, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "salt", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.06, drag: 0.93,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9FD8EA, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_brine", 1, BrineDefinition);
