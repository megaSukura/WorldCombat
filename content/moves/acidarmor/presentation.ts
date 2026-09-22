/**
 * 溶化 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者的身体当场塌成一滩泛光的酸，酸滴溅开、酸环贴地摊圆；持液态时身上不断滴落、脚下泛着气泡，
 *   凝回时酸滴倒吸回体内、重新聚成人形。
 *
 * 色相家族：酸绿（0x8FE06A）为主体，亮青绿（0xD6FFB0）做高光，深绿（0x4F7A3A）做余韵；没有第二个色相。
 * 层次：塌落（起）／溅开的酸滴、贴地酸环、黏液、气泡（击）／池面涟漪与滴落（收）／倒吸回体（末）。
 * 起击收：melt（化开）→ flow（流开）→ pool／slick（持液态）→ reform（凝回）。
 * 范围：酸池的酸环与气泡按 `data.scale`（实际酸池半径 / 2.0）摊到真实半径，画出来的圈就是会腐蚀到的范围。
 * 运动：酸滴由体内向外溅、受轻微重力落下；酸环贴地推开；池面低密度上浮；凝回时酸滴向心倒吸。
 * 数：酸滴量绑 `data.residue`（体重派生），`data.scale` 放大整片半径与粒子尺寸。
 * 持续状态：持液态低密度、贴地贴体，放在脚边与身侧，玩家仍看得清目标。
 */
const AcidArmorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        melt: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "melt_drip", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 14, shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.01, 0.06], drag: 0.93, gravity: 0.02, spin: 16,
                    lifetime: [8, 16], size: [0.2, 0.06],
                    color: 0x8FE06A, alpha: [0.6, 0], light: "world", maxParticles: 48
                }
            ]
        },
        flow: {
            duration: 36,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "flow_splash", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "residue", fallback: 24 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9, gravity: 0.02, spin: 18,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x8FE06A, alpha: [0.85, 0], light: "world", maxParticles: 170
                },
                {
                    name: "flow_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 2.0 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.44, 0.8], sizeMode: "index",
                    color: 0x4F7A3A, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "flow_ooze", bind: "source", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.93, gravity: 0.01, spin: 14,
                    lifetime: [16, 28], size: [0.3, 0.6],
                    color: 0x8FE06A, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "flow_bubble", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.09], drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0xB6F58A, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        pool: {
            exit: { drain: 28 },
            emitters: [
                {
                    name: "pool_ring", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, shape: { kind: "ring", radius: 2.0 },
                    direction: "outward", speed: [0.006, 0.02],
                    lifetime: [18, 30], size: [0.6, 1.0],
                    color: 0x8FE06A, alpha: [0.22, 0], light: "world", maxParticles: 20
                },
                {
                    name: "pool_bubble", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 3, shape: { kind: "circle", radius: 2.0, thickness: 1 },
                    direction: "up", speed: [0.006, 0.02],
                    lifetime: [16, 26], size: [0.12, 0.03],
                    color: 0xB6F58A, alpha: [0.3, 0], light: "full", maxParticles: 26
                },
                {
                    name: "pool_ooze", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 4, shape: { kind: "circle", radius: 1.4, thickness: 0 },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.3, 0.5],
                    color: 0x8FE06A, alpha: [0.18, 0], light: "world", maxParticles: 24
                }
            ]
        },
        slick: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "slick_drop", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 5, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.01, 0.04], gravity: 0.02,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xB6F58A, alpha: [0.4, 0], light: "world", maxParticles: 18
                },
                {
                    name: "slick_sheen", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 5, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xD6FFB0, alpha: [0.35, 0], light: "full", bloom: 0.3, maxParticles: 18
                },
                {
                    name: "slick_speed", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 4, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.2, 0.3],
                    color: 0x8FE06A, alpha: [0.25, 0], light: "world", maxParticles: 18
                }
            ]
        },
        reform: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "reform_flash", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    lifetime: [10, 14], size: [0.5, 0.9],
                    color: 0xD6FFB0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 4
                },
                {
                    name: "reform_gather", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0x8FE06A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acidarmor", 1, AcidArmorDefinition);
