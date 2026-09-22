/**
 * 防御指令 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者振翅，一队土黄色手下从身侧聚拢、贴住身体叠成一层会动的甲壳；甲壳维持着微微搏动，
 *   被清掉一只时那处炸开一小撮虫尘、甲壳随之薄一分，散场时虫群四散飞没。
 *
 * 色相家族：蜜蜡琥珀（0xF2C14E 主体、0xB07A2E 暗部）＋暖白（0xFFF3C4）只出现在聚拢与崩落；与攻击指令、回复指令同一族——同一个虫群。
 * 层次：聚拢（起）／贴身的甲壳与光膜（击）／甲壳搏动（收）／散落与四散（末）。
 * 起击收：call（召唤）→ cling（贴身）→ shed（被清）／spent（散去）→ disperse（甲壳散尽）。
 * 范围：贴身的甲壳由一只只实体手下撑起，玩家数得清还剩几只；光膜半径按 `data.scale`（实际环列半径 / 1.1）推出。
 * 运动：手下由外向内聚拢贴住；维持时甲壳轻微搏动；被清掉时虫尘向下崩落；散场时向外四散。
 * 数：召唤的爆发数绑 `data.burst`（手下面数 × 10）、甲壳微粒量绑 `data.motes`（两防派生），甲壳薄厚由 `data.guards`（活着的手下数）决定。
 * 持续状态：维持期只留一层半透明光膜与稀疏虫尘，玩家仍看得清目标与自己。
 */
const DefendOrderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "call_burst", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "burst", fallback: 30 } }, shape: { kind: "sphere_surface", radius: 0.75 },
                    direction: "inward", speed: [0.12, 0.32], drag: 0.9, spin: 8,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0xF2C14E, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "call_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 }, shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [14, 24], size: [0.34, 0.7],
                    color: 0xFFF3C4, alpha: [0.6, 0], light: "full", maxParticles: 16
                },
                {
                    name: "call_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 20 }, repeats: 2, interval: 5 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        cling: {
            exit: { drain: 18 },
            emitters: [
                {
                    name: "cling_shell", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.006, 0.02], spin: 8,
                    lifetime: [12, 22], size: { data: "size", fallback: 0.16 },
                    color: 0xF2C14E, alpha: [0.26, 0], light: "world", maxParticles: 14
                },
                {
                    name: "cling_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 16
                }
            ]
        },
        shed: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "shed_fall", bind: "source", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9, spin: 10,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xB07A2E, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "spent_mote", bind: "source", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xB07A2E, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        disperse: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "disperse_burst", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: 24 }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.01, drag: 0.92, spin: 8,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xF2C14E, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "disperse_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.28, 0.5],
                    color: 0xB07A2E, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_defendorder", 1, DefendOrderDefinition);
