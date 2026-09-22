/**
 * 电网 / electroweb 的客户端表现。
 *
 * 一句话：指爪间先织起一团电丝，随后一张发光的电网被抛出去，落地摊开成一张平铺在地上的网面，
 * 网线持续噼啪；有东西踩上去时那一处炸开电花，网面还留在原地一段时间才暗下去。
 * 色相家族：电青（0xC7EEFF）为主、浅黄（0xFFF3B0）作过载火花，白色只做命中点高光——电与白光是一家。
 * 拍子：起（weave 织网）→ 掷（toss 抛出）→ 驻（spread 张开 / hum 通电 / catch 踩中 / zap 余电）→ 收（hum 自然淡出）。
 * 范围：spread 与 hum 都是 `bind: "point"`、`fit: "none"`，用 `data.radius` 画 ring 与 circle，
 *   画出来的网面就是实际会被电到的那块地。
 * 运动：网面抛出时贴着抛物线走；摊开后粒子主要沿网面横向铺开，只有踩中时向上炸。
 * 数：`data.flow`（网面半径派生）决定网线密度，`data.stages`（减速级数）决定命中亮度与电花量，
 *   `data.scale`（半径 / 参考半径 2.2）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ElectrowebDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        weave: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "threads", bind: "source", offset: [0, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.1], spin: 12,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xC7EEFF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xFFF3B0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        toss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "trail", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 34, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.08], spread: 16,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xC7EEFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "dash", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xBFE9FF, alpha: [0.5, 0], light: "full", maxParticles: 48
                }
            ]
        },
        spread: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xC7EEFF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "cage", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "flow", fallback: 60 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC7EEFF, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 140
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "net_ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 30, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.24, 0.5],
                    color: 0xBFE9FF, alpha: [0.4, 0], light: "full", maxParticles: 70
                },
                {
                    name: "net_mesh", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.005, 0.04], spread: 24,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xC7EEFF, alpha: [0.5, 0], light: "full", maxParticles: 160
                },
                {
                    name: "net_spokes", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spinbeam",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.04, 0.14], spin: 20,
                    lifetime: [8, 16], size: [0.1, 0.03],
                    color: 0xFFF3B0, alpha: [0.45, 0], light: "full", bloom: 0.25, maxParticles: 90
                }
            ]
        },
        catch: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "jolt", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "stages", fallback: 2 }, interval: 4, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "bind", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 20, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC7EEFF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        zap: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "residual", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xFFF3B0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_electroweb", 1, ElectrowebDefinition);
