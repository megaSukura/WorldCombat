/**
 * 暴风 / hurricane 的客户端表现。
 *
 * 一句话：施法者身边先卷起一道上升气流，随后一堵会走的旋风贴地席卷而过，把途径上的人卷起抛出，
 * 被卷晕的人头顶转起飞鸟。
 * 色相家族：青白（0x9FD8E8）与近白（0xEAF6FA），只在冲击核心一点点偏亮；一个冷色家族贯穿始终。
 * 拍子：起 windup（聚风）→ gather（风眼成立）→ 击 sweep（风墙行进）与 impact（卷入）→ 散 dissipate（风散）。
 * 范围：sweep 的地面环与风墙都用 `data.radius`（机制涡径）画，涡心每刻更新到风真正在的位置，玩家看到环在哪就知道会扫到哪。
 * 运动：风带贴地旋转并随涡心前进，目标身上向外迸风屑、沿风的去向被抛出；晴天时涡心左右摆动，画面与机制同步。
 * 数：`data.spin`（风带数）驱动风带密度，`data.intensity`（风威 / 95）抬高亮度与密度，`data.radius` 决定环与风墙大小，
 * `data.confuse` 决定是否在目标头顶挂出飞鸟，`data.step`/`data.steps` 让行进阶段可读。
 */
const HurricaneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "updraft", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.12], spin: 16,
                    lifetime: [10, 18], size: [0.3, 0.1],
                    color: 0x9FD8E8, alpha: [0.35, 0], light: "world", maxParticles: 30
                },
                {
                    name: "lift", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [8, 15], size: [0.05, 0.02],
                    color: 0xEAF6FA, alpha: [0.5, 0], gravity: 0.01, drag: 0.95, light: "world", maxParticles: 30
                }
            ]
        },
        gather: {
            duration: 22,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "eye", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 90 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.6 }, length: 2.4 },
                    direction: "shape", speed: [0.04, 0.16], spin: 26,
                    lifetime: [12, 22], size: [0.4, 0.14],
                    color: 0xBDE4EE, alpha: [0.32, 0], light: "world", render: "translucent", maxParticles: 180
                }
            ]
        },
        sweep: {
            duration: 0,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "wall", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 110 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.6 }, length: 2.6 },
                    direction: "shape", speed: [0.05, 0.2], spin: 30,
                    lifetime: [12, 22], size: [0.42, 0.15],
                    color: 0x9FD8E8, alpha: [0.32, 0], light: "world", render: "translucent", maxParticles: 240
                },
                {
                    name: "bands", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "flow", fallback: 110 },
                    shape: { kind: "torus", radius: { data: "radius", fallback: 2.6 }, thickness: 0.6 },
                    direction: "shape", speed: [0.1, 0.34], spin: 34,
                    lifetime: [7, 13], size: [0.2, 0.05],
                    color: 0xEAF6FA, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 12, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [14, 24], size: [0.42, 1.0], sizeMode: "sin",
                    color: 0x9FD8E8, alpha: [0.22, 0], light: "world", render: "translucent", maxParticles: 50
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 110 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "inward", speed: [0.05, 0.2], spin: 20,
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0xCFE8F0, alpha: [0.6, 0], gravity: 0.02, drag: 0.93, light: "world", maxParticles: 180
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "gale_hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.28], spread: 18,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "throw_speed", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: { curve: [[0, 0.08], [1, 0.26]] },
                    lifetime: [6, 11], size: [0.18, 0.04],
                    color: 0xEAF6FA, alpha: [0.7, 0], light: "full", maxParticles: 50
                },
                {
                    name: "confuse_bird", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: { data: "confuse", fallback: 0 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.2, 0.05],
                    color: 0xD8F0FA, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        dissipate: {
            duration: 30,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "scatter", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.14, 0.4], spin: 26,
                    lifetime: [16, 30], size: [0.34, 0.1],
                    color: 0xBDE4EE, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [14, 22], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0x9FD8E8, alpha: [0.4, 0], light: "world"
                }
            ]
        },
        fumble: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "self_hit", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "power", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [9, 15], size: [0.16, 0.04],
                    color: 0x9FD8E8, alpha: [0.65, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "birds", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 5, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.18, 0.04],
                    color: 0x9FD8E8, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hurricane", 1, HurricaneDefinition);
