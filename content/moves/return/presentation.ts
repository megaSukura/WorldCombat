/**
 * 报恩 / return 的客户端表现。
 *
 * 一句话：脚下一圈金色誓约由暗到亮地结起，随后一道金光贴着地面直冲对手，撞实的一刻炸开一团暖金冲击，
 * 受托式会带着余辉从对手身侧越过去。
 * 色相家族：暖金与近白（energyorb、glowingsparkle_yellow、impact_normal、mediumring）为主，扬尘用暖土黄；
 * 没有冷色。
 * 拍子：起（pledge 结誓）→ 行（dash 直冲）→ 击（impact 炸开）→ 收（through 越过 / miss 扑空）。
 * 范围：impact 绑命中点，画出的就是撞中的位置；dash 的金光沿施法者实际走过的直线铺开。
 * 运动：誓约从脚下向上收拢，直冲的金光一路拖出尾迹，撞实是短促外爆，越过是贴地滑出的余辉。
 * 数：`data.trail`（本击威力换算）绑定 dash 的尾迹发射率，`data.sparks`（本击威力换算）绑定 impact 的爆开数量，
 * `data.bond`（亲密度比例）让起手的金色誓约亮度随羁绊增强，`data.intensity` 再整体抬高亮度与密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ReturnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pledge: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 14 },
            emitters: [
                {
                    name: "oath_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 8, shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.42, 0.2], sizeMode: "index",
                    color: 0xE8B44A, alpha: [{ data: "bond", fallback: 0.5 }, 0], light: "world", maxParticles: 20
                },
                {
                    name: "oath_gather", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.13, 0.04], sizeMode: "sin",
                    color: 0xFFD98A, alpha: [{ data: "bond", fallback: 0.5 }, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "oath_sparks", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.09, 0.03],
                    color: 0xFFF6DC, alpha: [{ data: "bond", fallback: 0.5 }, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        dash: {
            duration: 42,
            exit: { stop: 32, drain: 14 },
            emitters: [
                {
                    name: "gold_trail", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "trail", fallback: 40 }, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.1, 0.02],
                    color: 0xFFF2C0, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 180
                },
                {
                    name: "gold_body", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.4, 0.3] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 10], size: [0.14, 0.05],
                    color: 0xFFD98A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 110
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, trail: { minDistance: 0.34 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [7, 14], size: [0.08, 0.02],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.44,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [5, 11], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0xFFD98A, alpha: [0.65, 0], light: "full"
                },
                {
                    name: "scuff", bind: "point", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xC9A66B, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        through: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wake", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 24, trail: { minDistance: 0.24 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "slip_dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xC9A66B, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "overrun", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_return", 1, ReturnDefinition);
