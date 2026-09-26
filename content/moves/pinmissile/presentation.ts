/**
 * 飞弹针 / pinmissile 的客户端表现。
 *
 * 一句话：施法者抖开一身虫绿细针，一根接一根「咻、咻」地追着目标飞过去，每根扎进去就留在身上不拔；
 *   扎得越多，目标身上亮起的针头越多，直到钉刺到期或被清除才一起退去；撞在墙上的那根只扎在表面。
 * 色相家族：虫绿（0x9FD44A spike 偏色）＋近白针尖亮点（glowingsparkle）＋一点impact 亮边。
 * 拍子：起 bristle（竖针）→ 射 volley（一根接一根，真实投影）→ 钉 stick／扎墙 stuck／被挡 blocked
 *   → 持续 pinned（身上针头数＝实际层数）→ 收 done（针架回收）。
 * 范围：本招是单体追踪连发，画面靠每根针的真实轨迹标出「追到哪」，落点在目标身上，没有地面轮廓。
 * 运动：每根针是服务端 `LivingActions.projectile` 的真投递（`bind:"projectile"`），命中在目标身上炸开一小簇。
 * 数：`data.shots` 让起手读出一梭几根，`data.count`（已钉住的根数）绑定 stick／pinned 的针头数量（越钉越多），
 *   `data.pins` 是上限，`data.bristles`（物攻换算的针量）绑定命中碎屑量，`data.intensity`（单针威力 / 25）放大整幕，
 *   `data.scale`（针判定 / 0.13）让大个子的针更长。
 */
const PinmissileDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bristle: {
            duration: 12,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "shake", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shots", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0x9FD44A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 22
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 9], size: [0.07, 0.015],
                    color: 0xE6F5B0, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "needle", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.2 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.02], spin: 4,
                    lifetime: [4, 8], size: [0.17, 0.04],
                    color: 0x9FD44A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: 12,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.04, drag: 0.92,
                    lifetime: [5, 10], size: [0.05, 0.015],
                    color: 0x8FA83A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        stick: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [4, 8], size: [0.24, 0.04], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 12
                },
                {
                    name: "pinned", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 1 }, at: 0 },
                    shape: { kind: "line", length: 0.3, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xB6E86B, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "chips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bristles", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.06, drag: 0.9,
                    lifetime: [7, 14], size: [0.05, 0.015],
                    color: 0x8FA83A, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        pinned: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "quills", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: { data: "count", fallback: 1 },
                    shape: { kind: "line", length: 0.28, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [14, 22], size: [0.13, 0.03],
                    color: 0xB6E86B, alpha: [0.8, 0], light: "full", maxParticles: 24
                },
                {
                    name: "ache", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.04], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 16], size: [0.04, 0.012],
                    color: 0x8FA83A, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        stuck: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "plant", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x9FD44A, alpha: [0.85, 0], light: "full", maxParticles: 6
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.05, drag: 0.9,
                    lifetime: [7, 12], size: [0.04, 0.012],
                    color: 0x8FA83A, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        blocked: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ward", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], spread: 24,
                    lifetime: [6, 11], size: [0.12, 0.025],
                    color: 0x7C8A5A, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        done: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.28, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0x9FD44A, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pinmissile", 1, PinmissileDefinition);
