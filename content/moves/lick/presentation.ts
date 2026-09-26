/**
 * 舌舔 / lick 的客户端表现。
 *
 * 一句话：舌头前先亮起一撮湿润的粉光，随后一条黏滑的长舌从嘴边snap 出去，沿服务端给出的前端逐刻探出；
 * 舔中处炸开一小片幽灵紫撞击与唾液，缠绕式再拖出一条卷住目标、朝施法者收回的舌头，最后舌头原路收回。
 * 色相家族：幽灵紫（0xB79AF0）与黏滑粉（0xE8A6D0）为主，中性 tinydust 作唾液点。
 * 拍子：起（windup 聚唾液）→ 击（lash，path 由服务端每刻更新到真实前端）→ 收（impact 舔中 / drag 收回 / miss 落空/撞墙）。
 * 范围：lash 的 polyline 直接消费服务端 `data.path`（嘴 ↔ 真实前端）；撞墙或被前排挡住时，前端就停在那个接触点。
 * 运动：舌头顺直线逐刻伸长、唾液向外甩、缠绕式沿反方向把目标那段拽回；落空只留一小片唾液。
 * 数：`data.intensity`（本击威力 / 30）抬高中点亮度，path 顶点随服务端阶段每刻更新。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "saliva", bind: "source", offset: [0, 0.55, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xE8A6D0, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "draw", bind: "source", offset: [0, 0.5, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xE8A6D0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        lash: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "tongue", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.02, 0.06],
                    lifetime: [5, 10], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xE8A6D0, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "tip", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [4, 9], size: [0.1, 0.03],
                    color: 0xF2C6E0, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "spit", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xE8A6D0, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xD8C4FF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 44
                },
                {
                    name: "splat", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 16], size: [0.1, 0.03],
                    color: 0xE8A6D0, alpha: [0.75, 0], light: "world", maxParticles: 80
                }
            ]
        },
        drag: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "reel", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.2, 0.06], spin: 5,
                    color: 0xC9A6E0, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "pull", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xE8A6D0, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scatter", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.03,
                    lifetime: [7, 14], size: [0.05, 0.02],
                    color: 0xE8A6D0, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lick", 1, LickDefinition);
