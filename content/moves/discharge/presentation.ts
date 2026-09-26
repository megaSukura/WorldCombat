/**
 * 放电 / discharge 的客户端表现。
 *
 * 一句话：施法者身上攒起细碎火花，电光自身上同时迸出；每一次真正的命中都牵出一条从自己连到该目标的电弧，
 * 被电的人身上缠上一簇电花；广域式过一会儿重新检查圈内，再对各目标牵出较弱的余电，电花噼啪残留一阵。
 * 色相家族：电黄与近白（electricity_white / electricity_yellow / bolt / impact_electric / glowingsparkle_yellow）为主体，
 * 冷白只做电心的强调。
 * 拍子：起（charge 攒电）→ 击（flash 自身迸发、hit 逐目标连线、echo 重新连线的余电）→ 散（crackle 噼啪残留）。
 * 范围：flash 是自身迸发，不带地面圈；hit/echo 的电弧沿服务端给出的 `data.path` 画出，路径首尾就是施法者与实际目标。
 * 数：`data.arcs`（特攻与等级派生）决定每道电弧的股数，`data.count`（威力派生）决定命中火花量。
 * 空放时只播 flash 的自身短火花，不牵任何弧、不铺圈。
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
            duration: 24,
            exit: { stop: 8, drain: 16 },
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
                    name: "core", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.35], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "sparks", bind: "source", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.22], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xFFF0A0, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        echo: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bolts", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 4 }, at: 1 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.4, 0.9], spread: 12,
                    lifetime: [4, 7], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "bolt_detail", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "arcs", fallback: 4 }, at: 1 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.12], spread: [10, 30],
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "arc", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/bolt",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08], spread: [4, 14],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "arc_detail", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.12], spread: [10, 30],
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
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
                    name: "fizzle", bind: "source", offset: [0, 0.05, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
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
