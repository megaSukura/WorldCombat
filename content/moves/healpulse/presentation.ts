/**
 * 治愈波动 / Heal Pulse 的粒子语言。
 *
 * 一句话：施法者胸口拢起一圈温润的蓝白光，一收一放把它推出去；波一面前行一面把走过的路留成光带，
 *   抵达伙伴时整圈化开、把他裹住。
 * 色相家族：波青 0x8FD8E8 作主体，近白 0xEAFBFF 作高光与回复，淡紫 0x9AA8E0 只作余韵。
 * 拍子：起（windup）／送（emit）／行（seek）／化（wash）；超范围或伙伴离场走 fizzle。
 * 运动：seek 由服务端每刻更新同一份数据——`point` 是波前当前位置、`path` 是「施法者→波前」已走过的光带、
 *   `direction` 是施法者→伙伴的实时方向。wave_front 绑 point 并靠 orient:"direction" 把环面转向行进方向，
 *   玩家读到的是一个真的在往前走的前沿；wave_lane 绑 path 沿已走过的线段铺开、朝向伙伴。
 * 数：快慢与粗细读 `density`（光点换算）、`radius`（波动半径）、`frontScale`（波前随行程放大）、
 *   `laneSize`／`sparkSize`（随体型与特攻的上下限）；wash 的化开数量绑定 `glow`，只随**实际回复量**决定，补得越足越亮。
 */
const HealPulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.65, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x8FD8E8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 0.75 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0x9AA8E0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        emit: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "push_ring", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: { data: "radius", fallback: 0.75 }, sizeMode: "linear",
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "push_motes", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.94,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        seek: {
            duration: 0,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "wave_lane", bind: "path", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "density", fallback: 6 }, shape: { kind: "polyline", closed: false },
                    direction: "toward", speed: [0.04, 0.12], drag: 0.9,
                    lifetime: [6, 12], size: { data: "laneSize", fallback: 0.18 }, sizeMode: "sin",
                    color: 0x8FD8E8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "wave_front", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { data: "density", fallback: 6 }, shape: { kind: "ring", radius: { data: "radius", fallback: 0.75 } },
                    orient: "direction", direction: "shape", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [6, 12], size: { data: "frontScale", fallback: 0.24 },
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "wave_spark", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "density", fallback: 6 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.4 } },
                    direction: "shape", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [5, 10], size: { data: "sparkSize", fallback: 0.06 },
                    color: 0xEAFBFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        wash: {
            duration: 32,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "wash_ring", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "circle", radius: { data: "radius", fallback: 0.75 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: { data: "scale", fallback: 0.3 },
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "wash_motes", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "glow", fallback: 12 }, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.75 } },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xEAFBFF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "wash_glow", bind: "target", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "glow", fallback: 8 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x9AA8E0, alpha: [0.4, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "break", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.6 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 16], size: { data: "scale", fallback: 0.07 },
                    color: 0x9AA8E0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_healpulse", 1, HealPulseDefinition);
