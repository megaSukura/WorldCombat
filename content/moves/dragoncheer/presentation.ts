/**
 * 龙声鼓舞 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者昂首蓄势，胸腔里透出玉绿色的龙息；一声吼出，声浪沿地面一圈圈推开、扫过每个队友，
 *   被扫到的人身上立起一柱鼓舞之光并留下一层贴身的绿光，龙属性的队友那层更亮更大；士气走完时轻轻散去。
 *
 * 色相家族：玉绿（0x63D6A4）为主体，近白（0xE8FFF2）做高光与声浪边缘；没有第二个色相。
 * 层次：蓄声（起手，光点向里收）／声浪与鼓舞（一圈圈推开、逐人亮起）／贴身士气（低密度持续）／散开。
 * 起击收：breathe（蓄声）→ roar（吼出）→ rally（每人身上的鼓舞）→ fade（散）。
 * 范围：声浪绑脚点、fit none，半径按 `data.scale`（实际鼓舞半径 / 4）推出，画出来的圈就是声浪罩到的范围。
 * 运动：蓄声光点向里收拢；声浪一圈圈向外推开；被罩到的友方身上迸起一柱光并转入缓慢上浮的贴身绿光。
 * 数：声浪圈数绑 `data.waves`（等级派生），光点数绑 `data.motes`（特攻与等级派生），
 *   逐人光环的强弱绑 `data.dragon`（是否龙属性）；整体尺度绑 `data.scale`。
 * 持续状态：贴身士气低密度、放在脚边与身体两侧，玩家仍看得清目标。
 */
const DragonCheerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        breathe: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "breathe_mote", bind: "source", fit: "none", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.92, spin: 8,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x63D6A4, alpha: [0.65, 0], light: "full", bloom: 0.25, maxParticles: 46
                },
                {
                    name: "breathe_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 5 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.28, 0.5], sizeMode: "index",
                    color: 0xE8FFF2, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        },
        roar: {
            duration: 42,
            exit: { stop: 16, drain: 28 },
            emitters: [
                {
                    name: "roar_wave", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "waves", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [16, 26], size: [0.55, 1.05], sizeMode: "index",
                    color: 0xE8FFF2, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "roar_burst", bind: "source", fit: "none", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.92, spin: 14,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x63D6A4, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 180
                },
                {
                    name: "roar_star", bind: "source", fit: "none", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 6, interval: 5, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], spin: 8,
                    lifetime: [14, 24], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xE8FFF2, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "roar_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0x63D6A4, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        },
        rally: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "rally_rune", bind: "target", fit: "body", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "runes", fallback: 1 }, interval: 4, repeats: 2 },
                    shape: { kind: "line", length: 1.0 }, orient: "fixed", direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.16, 0.05],
                    color: 0x63D6A4, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    name: "rally_column", bind: "target", fit: "body", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "line", length: 1.6 }, orient: "fixed", rate: 8, direction: "up", speed: 0.02,
                    lifetime: [10, 16], size: [0.2, 0.08],
                    color: 0xE8FFF2, alpha: [0.32, 0], light: "full", maxParticles: 24
                },
                {
                    name: "rally_mote", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [16, 26], size: [0.08, 0.01],
                    color: 0x63D6A4, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 44
                },
                {
                    name: "rally_halo", bind: "target", fit: "body", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0xE8FFF2, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_mote", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.09, 0.01],
                    color: 0x63D6A4, alpha: [0.4, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.22, 0.06],
                    color: 0xE8FFF2, alpha: [0.3, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragoncheer", 1, DragonCheerDefinition);
