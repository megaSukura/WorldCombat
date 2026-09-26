/**
 * 定身法 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者指尖攒出一枚烧红的钢钉，瞬时钉到目标身上，把它刚用过的那一手钉住；钉还在时，
 *   目标想再使那一手，就会在钉上撞出一蓬火花。
 *
 * 色相家族：钢灰（0x9AA3AD）画钉身与烟，警告橙（0xE86A3C）画烧红的钉尖与撞击，近白做高光。
 *   被点名的攻击类型换色：近战橙、远程钢灰、魔法冷蓝、其他金；被顶回的一手用冷白火星，
 *   与「刚钉上」区分。颜色由服务端算出的 kind 载荷驱动。
 * 层次：起（windup 攒钉）／出手（cast 施法者一侧的瞬时出手）／钉住（lock 钉入 + 名环）／
 *   持续（hold 钉的余烬，绑在真实定身载体上）／顶回（reject）／松（release 自己松开、break 被硬拔）。
 * 起击收：windup → cast → lock → hold → reject／release／break。
 * 数：定身钉数来自 data.nails，被点名招式的威力驱动命中强度 data.intensity；都由服务端算出的机制值驱动。
 */
const DisableDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "windup_nail", bind: "source", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "nails", fallback: 5 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.05], spin: 6,
                    color: 0xE86A3C, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "windup_dust", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0x9AA3AD, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        cast: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "cast_muzzle", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [4, 8], size: [0.18, 0.03], sizeMode: "index",
                    color: { attribute: "kind", colors: { melee: 0xE86A3C, ranged: 0x9AA3AD, magic: 0x8E9BFF, other: 0xE8C15A }, fallback: 0xE86A3C },
                    alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        lock: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "lock_burst", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.22, 0.03], sizeMode: "index",
                    color: { attribute: "kind", colors: { melee: 0xE86A3C, ranged: 0x9AA3AD, magic: 0x8E9BFF, other: 0xE8C15A }, fallback: 0xE86A3C },
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "lock_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0xD9E2EC, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "lock_sparks", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: { data: "nails", fallback: 5 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.26 }, direction: "outward", speed: [0.08, 0.22],
                    lifetime: [5, 9], size: [0.18, 0.02], sizeMode: "index",
                    color: 0xE8C15A, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "hold_ember", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.16 }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: { attribute: "kind", colors: { melee: 0xE86A3C, ranged: 0x9AA3AD, magic: 0x8E9BFF, other: 0xE8C15A }, fallback: 0xE86A3C },
                    alpha: [0.4, 0], light: "full", maxParticles: 20
                },
                {
                    name: "hold_marks", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    rate: { data: "nails", fallback: 5 }, shape: { kind: "circle", radius: 0.28 }, direction: "down", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.08, 0.02], color: 0xD9E2EC, alpha: [0.35, 0], light: "full", maxParticles: 22
                }
            ]
        },
        reject: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "reject_spark", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xD9E2EC, alpha: [0.85, 0], light: "full", maxParticles: 26
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "release_pop", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.16], lifetime: [8, 14], size: [0.14, 0.02], spin: 8,
                    color: 0x9AA3AD, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        break: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "break_snap", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.08, 0.24],
                    lifetime: [5, 10], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xB6BEC8, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "break_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "nails", fallback: 5 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], lifetime: [8, 14], size: [0.12, 0.02], spin: 12,
                    color: 0x9AA3AD, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.28 }, direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.18, 0.3], color: 0x6E7680, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_disable", 1, DisableDefinition);
