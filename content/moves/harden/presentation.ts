/**
 * 变硬 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者体表由内向外析出一层晶亮的棱壳，碎晶沿表面铺开、围成一层反光的晶环；
 *   壳在身时棱面间泛着冷光，每挨一击就崩落一层碎屑，被一记重击打裂时整层炸成碎晶飞散。
 *
 * 色相家族：冰青灰（0xCFE8E4）为主体，冷白（0xDCEFEB）做高光，深青（0x9FB8B3）做余韵；没有第二个色相。
 * 层次：内聚（起）／晶片、晶环与亮光（击）／棱面的冷光（收）／崩落的碎屑（受击）／炸开的碎晶（末）。
 * 起击收：clench（凝）→ crystal（结晶）→ shell（持壳）→ crack（崩屑）→ shatter（碎裂）。
 * 范围：晶环绑身体、fit none，半径按 `data.scale`（实际晶壳半径 / 1.1）推出，画出来的环就是壳护到的体积。
 * 运动：晶片由体内向外铺、贴体停住；晶环向外推开；持壳时冷光贴着棱面明灭；被打时碎屑向外崩落；碎裂时受重力落下。
 * 数：晶面量绑 `data.facets`（防御与等级派生），削伤程度绑 `data.intensity`（该击相对碎壳阈值），尺寸绑 `data.scale`。
 * 持续状态：持壳期低密度、贴身，玩家仍看得清目标。
 */
const HardenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        clench: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "clench_glint", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.9, spin: 16,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xDCEFEB, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        crystal: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "crystal_shard", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "facets", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.88, spin: 18,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0xCFE8E4, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "crystal_ring", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.4, 0.7], sizeMode: "index",
                    color: 0x9FB8B3, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "crystal_glint", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 10, interval: 5, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xDCEFEB, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        shell: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "shell_sheen", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2.5, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "up", speed: [0.006, 0.02], spin: 10,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xDCEFEB, alpha: [0.3, 0], light: "full", bloom: 0.3, maxParticles: 14
                },
                {
                    name: "shell_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2.5, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xCFE8E4, alpha: [0.28, 0], light: "world", maxParticles: 14
                }
            ]
        },
        crack: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "crack_shard", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "facets", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.035, drag: 0.92, spin: 22,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9FB8B3, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "crack_flash", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0xDCEFEB, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 4
                }
            ]
        },
        shatter: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shatter_fall", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "facets", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9, spin: 24,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x9FB8B3, alpha: [0.65, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shatter_flash", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0xDCEFEB, alpha: [0.65, 0], light: "full", bloom: 0.5, maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_harden", 1, HardenDefinition);
