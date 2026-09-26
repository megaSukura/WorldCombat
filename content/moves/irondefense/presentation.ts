/**
 * 铁壁 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚边涌起一圈铁水，铁环贴着地面推开，铁屑沿着身体往上爬、凝成一层冷铁壳；
 *   持壳期间贴身的金属片与冷光随状态同寿，受击在落点敲出铁火花，碎开时锈屑簌簌落下。
 *
 * 色相家族：铁灰蓝（0x8C9AA6）为主体，冷白（0xDCE6EE）做高光，深铁（0x5E6A74）做余韵；没有第二个色相。
 * 层次：涌动（起）／铁环、铁屑、白烟（击）／贴身的金属片与冷光（收）／敲铁火花（受击）／锈屑（末）。
 * 起击收：pour（浇铸）→ clad（凝壳）→ hold（持壳）→ struck（受击）→ shed（碎裂）。
 * 范围：铁环绑脚点、fit none，半径按 `data.scale`（实际铁环半径 / 1.2）推出，只在浇铸那一刻铺开；持壳只画贴身的片，不画额外范围罩。
 * 运动：铁屑由下往上爬、贴体聚拢；铁环一圈圈贴地推开；白烟随铁水升腾；金属片贴着体表随状态持续泛光；碎开时锈屑受重力落下。
 * 数：铁屑量绑 `data.filings`（体重派生），贴身金属片数绑 `data.plates`（体重派生），敲铁火花量绑 `data.sparks`（实际伤害占最大生命派生），`data.scale` 放大整片半径与粒子尺寸。
 * 持续状态：持壳期低密度、贴身、放在体表与脚边，玩家仍看得清目标。
 */
const IronDefenseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pour: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "pour_mote", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94, spin: 16,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0x8C9AA6, alpha: [0.55, 0], light: "world", maxParticles: 48
                }
            ]
        },
        clad: {
            duration: 40,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "clad_filings", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "filings", fallback: 28 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], drag: 0.9, gravity: -0.004, spin: 24,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0x8C9AA6, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "clad_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.44, 0.82], sizeMode: "index",
                    color: 0x5E6A74, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "clad_spark", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14, interval: 6, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xDCE6EE, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "clad_smoke", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.3, 0.6],
                    color: 0x5E6A74, alpha: [0.25, 0], light: "world", maxParticles: 30
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "hold_plate", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "plates", fallback: 6 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.004, 0.014], spin: 10,
                    lifetime: [14, 24], size: [0.1, 0.03],
                    color: 0x8C9AA6, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "hold_sheen", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2.5, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.008, 0.02], spin: 12,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xDCE6EE, alpha: [0.3, 0], light: "full", bloom: 0.3, maxParticles: 14
                },
                {
                    name: "hold_dust", bind: "source", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x8C9AA6, alpha: [0.28, 0], light: "world", maxParticles: 16
                }
            ]
        },
        shed: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "shed_fall", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.045, drag: 0.92, spin: 22,
                    lifetime: [14, 22], size: [0.14, 0.03],
                    color: 0x5E6A74, alpha: [0.6, 0], light: "world", maxParticles: 48
                },
                {
                    name: "shed_flash", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0xDCE6EE, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 4
                }
            ]
        },
        struck: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "struck_spark", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.05, drag: 0.9, spin: 24,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xDCE6EE, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 48
                },
                {
                    name: "struck_impact", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    lifetime: [8, 12], size: [0.34, 0.66],
                    color: 0x8C9AA6, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_irondefense", 1, IronDefenseDefinition);
