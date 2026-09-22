/**
 * 放电 / discharge 的客户端表现。
 *
 * 一句话：施法者身上攒起细碎火花，电光从身上同时迸出、沿地面铺开一圈电环，圈里的人各缠上一簇电弧；
 * 广域式过一会儿再迸一次较弱的余电，电花在圈内噼啪残留一阵。
 * 色相家族：电黄与近白（electricity_white / electricity_yellow / impact_electric / glowingsparkle_yellow）为主体，
 * 冷白只做电心的强调。
 * 拍子：起（charge 攒电）→ 击（flash 迸开、hit 缠身、echo 余电）→ 散（crackle 噼啪残留 / miss）。
 * 范围：flash / echo / crackle 的地面环按服务端传的 `data.radius`（真实电环半径）画出，圈就是会被电到的地。
 * 运动：电弧从中心向外高速迸出，命中后缠在目标身上；地面环给出整片作用区。
 * 数：`data.arcs`（特攻与等级派生）决定同时迸出的电弧道数，`data.flow`（半径派生）决定环上密度，
 * `data.count`（威力派生）决定命中火花量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DischargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "tick", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 6, shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [5, 10], size: [0.14, 0.03], spriteFrom: "random",
                    color: 0xFFF4B0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        flash: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "bolts", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.5, 1.1], spread: 10,
                    lifetime: [4, 8], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "field", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "flow", fallback: 80 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.6 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 8,
                    lifetime: [8, 16], size: [0.22, 0.5], spriteFrom: "random",
                    color: 0xFFEC8C, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "core", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.35], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "sparks", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 3.6 } },
                    direction: "outward", speed: [0.05, 0.22], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xFFF0A0, alpha: [0.8, 0], light: "full", maxParticles: 180
                }
            ]
        },
        echo: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bolts", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 4 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.4, 0.9], spread: 12,
                    lifetime: [4, 7], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "field", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.6 } },
                    direction: "outward", speed: [0.02, 0.08], spread: 8,
                    lifetime: [7, 14], size: [0.16, 0.36], spriteFrom: "random",
                    color: 0xFFF0A0, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "count", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [8, 16], size: [0.2, 0.04], spriteFrom: "random",
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        crackle: {
            duration: 24,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "residue", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 3 }, interval: 8, repeats: 3, at: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.6 } },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [5, 10], size: [0.14, 0.3], spriteFrom: "random",
                    color: 0xFFE96A, alpha: [0.45, 0], light: "full", maxParticles: 30
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "circle", radius: { data: "radius", fallback: 3.6 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.04, 0.01],
                    color: 0xFFF0A0, alpha: [0.3, 0], light: "full", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFE96A, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_discharge", 1, DischargeDefinition);
