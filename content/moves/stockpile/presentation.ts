/**
 * 蓄力 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把力一口口压进肚子，一层琥珀色的光壳箍住身体；每压一次箍紧一分、光壳涨大一分；
 *   被实打时崩掉一圈，碎光炸开、壳随之变小，全崩完时残光四散。
 *
 * 色相家族：琥珀金（0xF0B23A）作主体，暖白（0xFFF3C4）只做内芯高光，深褐（0x8A5A22）只做余韵；没有第二个色相。
 * 层次：聚力（起）／箍壳与内芯（击）／维持的光壳（收）／崩层与四散（末）。
 * 起击收：gather（聚力）→ store（箍壳）→ guard（维持）→ crack（崩层）／scatter（散尽）。
 * 范围：层环绑脚点、fit none，半径按 `data.scale`（实际层环半径 / 1.2）推出，画出来的圈就是光壳箍到的范围。
 * 运动：聚力时火星由外向内收；箍壳时一圈圈往里勒紧；维持时内芯贴着身体明灭；崩层时碎光向外炸开。
 * 数：层数绑在 `data.layers` 上——光壳尺寸 `data.shellSize`、环点与内芯的量都随层数增长，层数越多壳越厚。
 * 持续状态：维持期低密度、贴身，玩家仍看得清目标。
 */
const StockpileDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9, spin: 10,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 34
                }
            ]
        },
        store: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "store_core", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 6, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.01, 0.05], spin: 14,
                    lifetime: [12, 22], size: { data: "shellSize", fallback: 0.2 },
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 22
                },
                {
                    name: "store_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "layer", fallback: 1 }, interval: 5 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [14, 24], size: [0.4, 0.75], sizeMode: "index",
                    color: 0xF0B23A, alpha: [0.65, 0], light: "world", maxParticles: 24
                },
                {
                    name: "store_shard", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "charge", fallback: 10 } }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF0B23A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        guard: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "guard_shell", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 3, shape: { kind: "sphere", radius: { data: "rind", fallback: 0.9 } },
                    direction: "inward", speed: [0.008, 0.025], spin: 10,
                    lifetime: [14, 24], size: { data: "shellSize", fallback: 0.2 },
                    color: 0xF0B23A, alpha: [0.3, 0], light: "world", maxParticles: 14
                },
                {
                    name: "guard_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "layers", fallback: 1 }, interval: 10, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "rind", fallback: 0.9 } },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.34, 0.6], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [0.35, 0], light: "full", maxParticles: 12
                },
                {
                    name: "guard_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xF0B23A, alpha: [0.3, 0], light: "world", maxParticles: 14
                }
            ]
        },
        crack: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack_shard", bind: "target", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "layer", fallback: 1 }, interval: 1, repeats: 1 },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.01, drag: 0.9, spin: 18,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "crack_flash", bind: "target", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: { data: "scale", fallback: 1 },
                    color: 0xF0B23A, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        scatter: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scatter_mote", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "layers", fallback: 1 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0x8A5A22, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stockpile", 1, StockpileDefinition);
