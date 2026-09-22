/**
 * 闭关 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者缩起身子，一圈铁板从脚边合拢、裹成一颗带接缝的壳；持壳时壳面泛着冷光，
 *   挨打时裂纹炸开、火星四溅，打满就整颗崩开、碎板坠地。
 *
 * 色相家族：铁蓝（0x9BB0C9）为主体，冷白（0xE4EDF7）做高光，深铁（0x5E6E80）做余韵；没有第二个色相。
 * 层次：向心收拢的铁屑（起）／合拢的铁板、铁环、火星（击）／贴身的冷光（收）／裂纹与坠落的碎板（末）。
 * 起击收：curl（缩壳）→ brace（合壳）→ hold（持壳）→ crack（裂纹）→ shatter（崩开）。
 * 范围：壳环绑身体、fit body，半径按 `data.scale`（实际壳半径 / 1.2）缩放，画出来的圈就是壳护到的范围。
 * 运动：铁屑向心收拢；铁板由体表向外合拢；火星向外溅；崩开时碎板受重力落下。
 * 数：壳板量绑 `data.plates`（防御与等级派生），挨打强度绑 `data.intensity`（承伤池剩余比例），`data.scale` 放大整片半径与粒子尺寸。
 * 持续状态：持壳期低密度、贴身，放在体表与脚边，玩家仍看得清目标。
 */
const ShelterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        curl: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "curl_gather", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.9, spin: 16,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0x9BB0C9, alpha: [0.6, 0], light: "world", maxParticles: 52
                }
            ]
        },
        brace: {
            duration: 38,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "brace_plates", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "plates", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.2, thickness: 0.85 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [16, 28], size: [0.28, 0.5],
                    color: 0x9BB0C9, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "brace_filings", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "plates", fallback: 10 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.4 },
                    direction: "inward", speed: [0.05, 0.18], drag: 0.9, spin: 22,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xE4EDF7, alpha: [0.8, 0], light: "world", maxParticles: 120
                },
                {
                    name: "brace_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [14, 22], size: [0.44, 0.8], sizeMode: "index",
                    color: 0x5E6E80, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "brace_spark", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12, interval: 6, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xE4EDF7, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "hold_sheen", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2.4, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.02], spin: 12,
                    lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xE4EDF7, alpha: [0.3, 0], light: "full", bloom: 0.3, maxParticles: 14
                },
                {
                    name: "hold_dust", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x9BB0C9, alpha: [0.26, 0], light: "world", maxParticles: 16
                }
            ]
        },
        crack: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "crack_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    lifetime: [8, 12], size: [0.5, 0.9],
                    color: 0xE4EDF7, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 4
                },
                {
                    name: "crack_shards", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92, spin: 20,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x9BB0C9, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        shatter: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "shatter_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    lifetime: [10, 14], size: [0.7, 1.1],
                    color: 0xE4EDF7, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 4
                },
                {
                    name: "shatter_plates", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.15], gravity: 0.05, drag: 0.92, spin: 24,
                    lifetime: [14, 22], size: [0.24, 0.1],
                    color: 0x9BB0C9, alpha: [0.6, 0], light: "world", maxParticles: 44
                },
                {
                    name: "shatter_dust", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.02, drag: 0.9,
                    lifetime: [16, 26], size: [0.3, 0.5],
                    color: 0x5E6E80, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shelter", 1, ShelterDefinition);
