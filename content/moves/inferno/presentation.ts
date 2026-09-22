/**
 * 炼狱 / inferno 的客户端表现。
 *
 * 一句话：落点的地面先被一圈焦黑的热痕圈住、贴着地闷响并冒起热光（预热窗口），随后烈焰从地里涌起、
 *   向上卷成一根把整圈包住的火柱，火里翻涌着火星与黑烟；被卷到的人身上整个烧起来，烧完只剩一圈余火。
 * 色相家族：烈焰橙红（0xFF6A22）与热芯白（0xFFE08A）为主体，烟黑（0x2A1A14）衬托。
 * 拍子：起 kindle（聚火）→ 印 mark（焦痕预热）→ 涌 bloom（火柱）→ 裹 engulf（裹住目标）→ 熄 ember（余火）。
 * 范围：mark / bloom / ember 的地面盘按服务端传的 `data.radius`（真实火柱半径）画出，圈就是会被烧到的地。
 * 运动：火柱竖直上涌，火星向外、向上翻卷，余火贴地慢慢灭。
 * 数：火柱与外焰密度绑定 `data.embers`（特攻与等级换算），engulf 的火量绑定 `data.count`（威力派生），
 *   强度绑定 `data.intensity`（威力派生）；mark 的预热长度来自 `data.fuse`。
 */
const InfernoDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 16, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.22, 0.05],
                    color: 0xFFE08A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFF6A22, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "smoke", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 22], size: [0.24, 0.4],
                    color: 0x2A1A14, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        },
        mark: {
            duration: 0,
            emitters: [
                {
                    name: "scorch_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "embers", fallback: 14 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.1 } },
                    direction: "inward", speed: [0.0, 0.05],
                    lifetime: [10, 18], size: [0.3, 0.5],
                    color: 0x2A1A14, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "heat_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "embers", fallback: 12 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.1 } },
                    direction: "up", speed: [0.01, 0.06], spread: 12,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFF6A22, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        bloom: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "embers", fallback: 40 }, shape: { kind: "cylinder", radius: 0.55, length: 2.8 },
                    direction: "up", speed: [0.08, 0.28], spread: 12,
                    lifetime: [8, 16], size: [0.28, 0.05],
                    color: 0xFF6A22, alpha: [0.92, 0], light: "full", bloom: 0.4, maxParticles: 180
                },
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "embers", fallback: 20 }, shape: { kind: "cylinder", radius: 0.4, length: 2.6 },
                    direction: "up", speed: [0.05, 0.2], spread: 8,
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFE08A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 2.1 } },
                    direction: "outward", speed: [0.12, 0.4], spread: 24,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 2.1 } },
                    direction: "outward", speed: [0.1, 0.36], spread: 26,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 20, shape: { kind: "cylinder", radius: 0.9, length: 2.8 },
                    direction: "up", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [14, 26], size: [0.38, 0.64],
                    color: 0x2A1A14, alpha: [0.42, 0], light: "world", maxParticles: 110
                }
            ]
        },
        engulf: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.34], spread: 20,
                    lifetime: [6, 12], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 56
                },
                {
                    name: "wrap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], spread: 18,
                    lifetime: [10, 20], size: [0.22, 0.04],
                    color: 0xFF6A22, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "smoke", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0x2A1A14, alpha: [0.35, 0], light: "world", maxParticles: 34
                }
            ]
        },
        ember: {
            duration: 28,
            exit: { drain: 22 },
            emitters: [
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 12 }, interval: 6, repeats: 3, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.1 } },
                    direction: "outward", speed: [0.02, 0.09], spread: 18,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xFF6A24, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "low_smoke", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 2.1 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 28], size: [0.34, 0.54],
                    color: 0x2A1A14, alpha: [0.28, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_inferno", 1, InfernoDefinition);
