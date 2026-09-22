/**
 * 豁出去 / temperflare 的客户端表现。
 *
 * 一句话：火从脚下窜起裹住身体 → 施法者拖着一路火尾撞向目标 → 撞上的那一下连人带火炸开，
 *   火星四散燎到身边的人，落点地面留下一圈慢慢熄灭的焦痕。
 * 色相家族：炽橙与赤红（0xFF7A2A / 0xE0562A）为主体，近白（0xFFE6B0）只给爆炸核心，灰烟作余韵；一个暖色家族。
 * 拍子：起 gather（点火）→ 撞 charge（拖火尾冲锋）→ 击 burst（炸开）→ 燎 scorch（溅射）→ 痕 char（焦痕）。
 * 范围：burst 的核心与外扩按 `data.scale`（爆开半径 / 1.5）放大；char 按 `data.radius`（机制爆开半径）铺开。
 * 运动：火苗从脚下向上、冲锋时沿身体轨迹拖在身后、撞击时向外炸开，焦痕贴地留下。
 * 数：burst／scorch 的火星量绑定 `data.embers`（物攻与等级换算），强度绑定命中威力，`data.doubled` 决定火焰是否更亮更大。
 */
const TemperflareDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "gather_flame", bind: "source", offset: [0, 0.05, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 16, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.24, 0.05],
                    color: 0xFF7A2A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "gather_ember", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFE6B0, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 30,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "charge_trail", bind: "source", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    trail: { minDistance: 0.35 }, rate: 30, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.26, 0.06],
                    color: 0xFF7A2A, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "charge_smoke", bind: "source", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    trail: { minDistance: 0.5 }, rate: 12, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.01, 0.06], drag: 0.95,
                    lifetime: [10, 20], size: [0.2, 0.45], sizeMode: "linear",
                    alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst_fire", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.36], spread: 30,
                    lifetime: [8, 15], size: [0.5, 0.08],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 10
                },
                {
                    name: "burst_rock", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "embers", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.16, 0.5], gravity: 0.06, drag: 0.95, spread: 40,
                    lifetime: [10, 20], size: [0.16, 0.04],
                    color: 0xFF7A2A, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 18], size: [0.36, 0.9], sizeMode: "linear",
                    color: 0xFF9A3A, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 8
                }
            ]
        },
        scorch: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scorch_flame", bind: "target", offset: [0, 0.3, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xFF9A3A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 34
                }
            ]
        },
        char: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "char_mark", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    lifetime: [26, 44], size: 0.6,
                    color: 0x6E4A32, alpha: [0.55, 0], light: "world", maxParticles: 12
                },
                {
                    name: "char_ember", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 10, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.09, 0.01],
                    color: 0xFFB257, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_temperflare", 1, TemperflareDefinition);
