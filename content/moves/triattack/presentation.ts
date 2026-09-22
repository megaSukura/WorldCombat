/**
 * 三重攻击 / triattack 的客户端表现。
 *
 * 一句话：掌心分别拢起橙、青、黄三团光，三束同时离手朝目标扫去，命中处各自炸开该元素的一小片光并把余痕按在目标身上。
 * 色相家族：这招的身份就是三种元素色——电黄 0xFFE14D、火橙 0xFF7A3D、冰青 0xBFEFFF，加中性白做闪光；
 *   三个色相同时出现是机制本身（三束各一种），每一束自己的 moment 只用自己那一色。
 * 拍子：起（windup 三色拢光）→ 放（release 三色迸发）→ 中（spark／ember／frost 各自爆开）→ 空（fizzle 散光）。
 * 范围：release 绑 `source`（fit body），三束的爆开绑 `point`（fit none），爆开半径用 `data.scale`
 *   跟随机制里的实际爆开半径；`data.fan`（广域张角）让三束在广域式下明显分开。
 * 运动：起手三色光向内收；release 三色向外炸开；命中处元素光向外爆、并有一层贴在 `target` 上做余痕。
 * 数：`data.motes`（特攻派生）决定每束爆开的粒子数、`data.rays`（本次束数）决定 release 的光束与环的点数、
 *   `data.intensity`（每束威力派生）抬亮命中那一下。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TriattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "ember_gather", bind: "source", offset: [-0.28, 0.5, 0.32], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.09], spin: 24,
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xFF7A3D, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "frost_gather", bind: "source", offset: [0, 0.5, 0.32], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.09], spin: 18,
                    lifetime: [6, 11], size: [0.1, 0.02],
                    color: 0xBFEFFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "spark_gather", bind: "source", offset: [0.28, 0.5, 0.32], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.1], spin: 20,
                    lifetime: [5, 10], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xFFE14D, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fan_electric", bind: "source", offset: [0.28, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.3], spread: 14,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "fan_fire", bind: "source", offset: [-0.28, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.3], spread: 14,
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xFF7A3D, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "fan_frost", bind: "source", offset: [0, 0.58, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.3], spread: 14, spin: 18,
                    lifetime: [7, 13], size: [0.12, 0.03],
                    color: 0xBFEFFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "fan_ring", bind: "source", offset: [0, 0.5, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "rays", fallback: 3 }, at: 2 },
                    shape: { kind: "ring", radius: 0.34, arcDegrees: { data: "fan", fallback: 26 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [8, 16], size: [0.2, 0.42],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        spark: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "discharge", bind: "point", offset: [0, 0.42, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.28], spread: 16,
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "arcs", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.24], spread: 12,
                    lifetime: [5, 11], size: [0.12, 0.02],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cling", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        ember: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.28], spread: 16,
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xFFD9A0, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.22], spread: 16, gravity: 0.02,
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0xFF7A3D, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFF7A3D, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        frost: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shatter", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "motes", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.28], spread: 16,
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.24], spread: 14, spin: 22,
                    lifetime: [7, 14], size: [0.12, 0.02],
                    color: 0xBFEFFF, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cling", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xBFEFFF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.02,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xD8D8E0, alpha: [0.6, 0], maxParticles: 30
                },
                {
                    name: "sparkle", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_triattack", 1, TriattackDefinition);
