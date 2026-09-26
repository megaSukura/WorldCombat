/**
 * 报仇 / retaliate 的客户端表现。
 *
 * 一句话：施法者低头一瞬、身上压出灰白的哀气，带哀兵时一束短余光从真正倒下的同伴那边连到身上 → 带着这股劲直直撞向目标
 *   → 撞上处炸开一圈惨白的光与冲击，哀兵那一记命中后哀气向上一散；空撞只留下一小撮余尘。
 * 色相家族：灰白与银（0xD9D2C4 / 0xF2EEE4）为主体，惨白高光只给「哀兵」那一撞；不引入第二个色相。
 * 拍子：起 mourn（压低哀气 + 同伴余光）→ 撞 charge（拖速度线冲锋）→ 击 strike（冲击炸开）→ 释 release（哀气散去）→ 空 miss。
 * 范围：strike 的环与外爆按 `data.scale`（判定半径 / 0.45）放大，撞到哪块区域一眼可读。
 * 运动：速度线沿身体轨迹拖在身后，冲击在命中点向外炸开；同伴的余光是一束短促的线，不假装沿路径飞行。
 * 数：strike/release 的冲击点数绑定 `data.streaks`（物攻与等级换算），强度绑定命中威力；
 *   mourn 的余光与哀气点数由服务端按「是否带哀兵、离倒下同伴多远」算好（`data.link`/`data.wisp`），免疫/无现场时为 0。
 */
const RetaliateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mourn: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "mourn_aura", bind: "source", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 12, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.28, 0.06], sizeMode: "linear",
                    color: 0xD9D2C4, alpha: [0.5, 0], light: "full", maxParticles: 26
                },
                {
                    name: "mourn_dust", bind: "source", offset: [0, 0.05, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.02,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xC9C2B4, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "mourn_link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "link", fallback: 0 }, at: 0 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xF2EEE4, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "mourn_wisp", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "wisp", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xF2EEE4, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        charge: {
            duration: 30,
            exit: { stop: 16, drain: 14 },
            emitters: [
                {
                    name: "charge_lines", bind: "source", offset: [0, 0.35, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    trail: { minDistance: 0.4 }, rate: { data: "streaks", fallback: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [7, 12], size: [0.2, 0.04],
                    color: 0xF2EEE4, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "charge_streak", bind: "source", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.5 }, rate: 18, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.09, 0.01],
                    color: 0xD9D2C4, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "strike_hit", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.3], spread: 30,
                    lifetime: [8, 15], size: [0.46, 0.08],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", maxParticles: 10
                },
                {
                    name: "strike_spark", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "streaks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], spread: 35,
                    lifetime: [8, 16], size: [0.11, 0.02],
                    color: 0xF2EEE4, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 48
                },
                {
                    name: "strike_ring", bind: "target", offset: [0, 0.08, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.3, 0.9], sizeMode: "linear",
                    color: 0xD9D2C4, alpha: [0.5, 0], light: "full", maxParticles: 8
                }
            ]
        },
        release: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "release_ring", bind: "target", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.3, 0.85], sizeMode: "linear",
                    color: 0xF2EEE4, alpha: [0.6, 0], light: "full", maxParticles: 8
                },
                {
                    name: "release_wisp", bind: "target", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "streaks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.16], spread: 20,
                    lifetime: [10, 20], size: [0.13, 0.02],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 32
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "miss_dust", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xC9C2B4, alpha: [0.45, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_retaliate", 1, RetaliateDefinition);
