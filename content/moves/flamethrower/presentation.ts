/**
 * 喷射火焰 / flamethrower 的客户端表现。
 *
 * 一句话：喉间先攒起一点白热的核心，随后按住喷口喷出一道火舌——火舌从身前逐刻向远处伸长，沿一条走廊
 * （或一个扇面）压着扫过；被燎到的人身上炸开一圈火，喷完只剩余焰与烟慢慢散。
 * 色相家族：火苗橙（0xFF7A2E）与火心白黄（0xFFE2A0）为主体，深褐烟（0x3A2E2A）衬托。
 * 拍子：起 charge（攒气）→ 喷 jet／jetwide（火舌推进）→ 击 hit（燎到目标）→ 收 fade（余焰散去）。
 * 范围：jet／jetwide 沿服务端传的 `data.path`（与判定同一份、已被实墙裁短的火焰带顶点）铺设；
 *   窄式是一束平行火线的梯形带，宽式是从喷口张开的扇面，画到哪里就烧到哪里。
 * 运动：路径每 tick 由服务端重算，火舌一截截向前推；`data.point`／`data.head` 是当刻前沿，头部另起火团。
 * 数：发射率绑定 `data.density`（特攻与等级换算），强度绑定 `data.intensity`（威力派生），
 *   hit 的火量绑定 `data.count`（威力派生）。
 */
const FlamethrowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [6, 11], size: [0.2, 0.05],
                    color: 0xFFE2A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        jet: {
            duration: 0,
            emitters: [
                {
                    name: "nozzle", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 18, shape: { kind: "sphere", radius: 0.26 },
                    direction: "away", speed: [0.03, 0.12], spread: 10,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "stream", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "density", fallback: 70 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.12], spread: 8,
                    lifetime: [5, 10], size: [0.3, 0.06],
                    color: 0xFF7A2E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.02, 0.09], spread: 6,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2A0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "embers", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "density", fallback: 24 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [6, 13], size: [0.08, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 180
                },
                {
                    name: "head", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "density", fallback: 40 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "away", speed: [0.06, 0.24], spread: 18,
                    lifetime: [5, 10], size: [0.3, 0.05],
                    color: 0xFFE2A0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "smoke", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 22], size: [0.28, 0.44],
                    color: 0x3A2E2A, alpha: [0.3, 0], light: "world", maxParticles: 80
                }
            ]
        },
        jetwide: {
            duration: 0,
            emitters: [
                {
                    name: "nozzle", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 18, shape: { kind: "sphere", radius: 0.26 },
                    direction: "away", speed: [0.03, 0.12], spread: 10,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "density", fallback: 80 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.13], spread: 10,
                    lifetime: [5, 10], size: [0.3, 0.06],
                    color: 0xFF7A2E, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 240
                },
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.02, 0.08], spread: 6,
                    lifetime: [5, 9], size: [0.22, 0.04],
                    color: 0xFFE2A0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "embers", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.05, 0.22], spread: 24,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 200
                },
                {
                    name: "head", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "density", fallback: 40 }, shape: { kind: "sphere", radius: 0.38 },
                    direction: "away", speed: [0.06, 0.24], spread: 20,
                    lifetime: [5, 10], size: [0.3, 0.05],
                    color: 0xFFE2A0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "smoke", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 18, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 24], size: [0.3, 0.46],
                    color: 0x3A2E2A, alpha: [0.3, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0xFF7A2E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 44
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "dying_smoke", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 26], size: [0.34, 0.6],
                    color: 0x2E2624, alpha: [0.32, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flamethrower", 1, FlamethrowerDefinition);
