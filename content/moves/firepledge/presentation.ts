/**
 * 火之誓约 / firepledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈熔红的誓约符文，随后一根火柱从地面拔起把柱内的人烧着，柱脚留一圈缓慢燃烧的炭红余烬；
 *   与草／水共鸣时，整片地铺开翻涌的火海，或升起虹彩的光点与祝福光环。
 * 色相家族：橙红到亮黄（flame／ember／impact_fire／floorscorch）；彩虹时刻才引入虹彩第二色相
 *   （shinesparkle_rainbow／glowingsparkle_pink），与三誓约里草（绿）、水（青蓝）分开。
 * 拍子：起（mark，提交前的地面符文）→ 击（erupt 火柱 + hit 命中点）→ 留（scar 余烬，或 seaoffire／rainbow 组合场）。
 * 范围：mark／scar／seaoffire 的花环半径 = `data.scale` × 参考 1.7 格（= 实际誓约印半径）；
 *   erupt 的柱体 shape 直接绑定 `data.radius`／`data.height`，玩家看到的那根柱就是实际判定柱。
 * 运动：火柱贴地向上窜、火星带轻微重力回落；余烬缓慢上浮；火海向外翻涌；彩虹的光点上升。
 * 数：`data.count`（由特攻与本次威力派生）决定火星与火海的粒子数量，`data.combo` 在共鸣时切到组合场。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FirepledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.7 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "rune_heat", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xFFC24A, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_core", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "count", fallback: 70 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "shape", speed: [0.05, 0.35],
                    lifetime: [10, 18], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFF9A3A, alpha: [0.85, 0], light: "full", bloom: 0.6, maxParticles: 420
                },
                {
                    name: "column_flame", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 220,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "up", speed: [0.08, 0.5],
                    lifetime: [10, 20], size: [0.24, 0.04],
                    color: 0xFFB03A, alpha: [0.9, 0], gravity: -0.02, drag: 0.95, light: "full", maxParticles: 520
                },
                {
                    name: "column_embers", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "shape", speed: [0.12, 0.6],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD36A, alpha: [0.95, 0], gravity: 0.03, drag: 0.95, light: "full", maxParticles: 340
                },
                {
                    name: "scorch_ring", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [1.0, 1.4],
                    color: 0x8A3A18, alpha: [0.55, 0], light: "world", maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "sparks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.45],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFD06A, alpha: [0.95, 0], gravity: 0.04, light: "full"
                }
            ]
        },
        scar: {
            duration: 30,
            exit: { stop: 20, drain: 26 },
            emitters: [
                {
                    name: "ember_floor", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 26, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xE2621E, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "heat_low", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 10, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 28], size: [0.26, 0.5],
                    color: 0x7A2E14, alpha: [0.28, 0], light: "world", maxParticles: 40
                }
            ]
        },
        seaoffire: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "sea_flames", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 90, shape: { kind: "circle", radius: 1.7 },
                    direction: "shape", speed: [0.04, 0.22],
                    lifetime: [12, 22], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.8, 0], gravity: -0.008, drag: 0.95, light: "full", maxParticles: 320
                },
                {
                    name: "sea_embers", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 80 }, interval: 6, repeats: 5 },
                    shape: { kind: "circle", radius: 1.7 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD06A, alpha: [0.9, 0], gravity: 0.03, light: "full", maxParticles: 300
                },
                {
                    name: "sea_pulse", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 12, at: 0, interval: 12, repeats: 3 },
                    shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 22], size: [0.5, 0.14],
                    color: 0xFF6A26, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        rainbow: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "rainbow_rise", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 34, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.02, 0.12],
                    lifetime: [16, 28], size: [0.14, 0.02],
                    alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 160
                },
                {
                    name: "blessing", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFFD7EE, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "halo", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 10, at: 0, interval: 14, repeats: 3 },
                    shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [14, 22], size: [0.4, 0.12],
                    color: 0xFFF0B0, alpha: [0.5, 0], light: "full", maxParticles: 48
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firepledge", 1, FirepledgeDefinition);
