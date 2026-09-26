/**
 * 重磅冲撞 / heavyslam 的客户端表现。
 *
 * 一句话：施法者沉肩、钢甲上掠过一层冷光 → 地面先亮出一圈计划落点，整个人腾空翻了半圈、身后甩下碎石与速度线 →
 * 以身躯砸在**实际落地处**，该处炸开一圈灰白冲击与碎石 → 被砸中的目标身上爆出钢色钝击并被顶开时扬起一撮尘。
 * 色相家族：冷灰与钢白（impact_steel / groundquake / large_rock）为主体，土褐（earth / tinydust）作坑尘，无饱和色。
 * 拍子：起（windup 蓄势）→ 行（leap 腾空、mark 计划落点）→ 击（crash 跟随实际落地、impact 命中、shove 被顶开）→ 收（crash 的余尘）。
 * 范围：crash 绑**实际落点**、fit none，地面环半径按 `data.scale`（实际落点半径 / 2.0）铺开，画出的就是被罩住的地块。
 * 运动：跃起时碎石向上外甩，落地是贴地向外扩张的震环加向上崩起的碎块，余尘缓慢下沉。
 * 数：crash 的碎石量绑 `data.bursts`（命中目标数派生），强度绑 `data.intensity`（威力 / 90），impact 的尘量同样随威力变化。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeavySlamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "steel_sheen", bind: "source", offset: [0, 0.7, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xD8DCE4, alpha: [0.7, 0], light: "full", maxParticles: 46
                },
                {
                    name: "set_stance", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8A8272, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        leap: {
            duration: 30,
            exit: { stop: 22, drain: 14 },
            emitters: [
                {
                    name: "takeoff", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "body_grit", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.3 },
                    shape: { kind: "box", size: [0.4, 0.5, 0.4] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xA98A5E, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        mark: {
            duration: 32,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "planned_ring", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: 2.0 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.44, 0.66], sizeMode: "sin",
                    color: 0xD8DCE4, alpha: [0.4, 0], light: "world", maxParticles: 26
                },
                {
                    name: "planned_grit", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "circle", radius: 1.9 },
                    direction: "up", speed: [0.02, 0.06],
                    gravity: 0.03, drag: 0.95,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0x8A8272, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crash: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "shock_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "ring", radius: 2.0 },
                    direction: "outward", speed: [0.18, 0.4],
                    lifetime: [8, 14], size: [0.7, 0.12], sizeMode: "index",
                    color: 0xE6E8EC, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "bursts", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 1.2 },
                    direction: "outward", speed: [0.12, 0.42], spread: 40,
                    gravity: 0.12, drag: 0.93,
                    collision: { bounces: 2, verticalBounce: 0.4, dragAfter: 0.6 },
                    lifetime: [14, 26], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9A968C, alpha: [0.95, 0], light: "world", maxParticles: 120
                },
                {
                    name: "clods", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 40, at: 1 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "outward", speed: [0.06, 0.3],
                    gravity: 0.1, drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 160
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26, shape: { kind: "circle", radius: 1.4, thickness: 0.7 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.01, drag: 0.95,
                    lifetime: [20, 34], size: [0.34, 0.5],
                    color: 0x9A968C, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        shove: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pushed", bind: "target", offset: [0, 0.06, 0], height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "steel_hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.1, 0.3],
                    lifetime: [6, 11], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xF0F2F6, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "hit_grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.24],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8A8272, alpha: [0.6, 0], light: "world", maxParticles: 110
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_heavyslam", 1, HeavySlamDefinition);
