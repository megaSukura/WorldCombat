/**
 * 暗黑爆破 / nightdaze 的客户端表现。
 *
 * 一句话：周身的光先往身上沉、脚下压起一团将炸未炸的黑，随后一团漆黑从身上炸开、一圈圈向四周推出去，
 *   连空中一起吞进来；被卷进去的人身上炸开暗色碎屑，之后头顶一直翻着散不掉的暗尘。
 * 色相家族：近黑（0x140F1E）与深紫（0x2A2340）为主，靛蓝（0x4A3E6E）与淡紫（0x8A7BD0）只做小面积光点。
 * 拍子：起 gather（收光压黑）→ 爆 burst（炸开）→ 推 wave（暗波一步步外扩）→ 击 hit（吞住目标）→ 收 linger／clear。
 * 范围：wave 的半球壳按服务端传的 `data.radius`（本圈真实半径）与 `data.crest`（高度）画出，玩家看到的黑圈就是会被吞到的范围。
 * 运动：暗波从身上一圈圈向外推、连上方一起罩；命中处暗尘向外翻涌，笼罩期间头顶缓慢下沉。
 * 数：`data.motes`（特攻＋等级换算的暗尘数量）绑定各处发射量，`data.intensity`（暗波威力 / 85）放大整幕，
 *   `data.progress` 让同一发射器逐圈变大。
 */

const NightdazeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x140F1E, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "dregs", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [9, 16], size: [0.13, 0.03],
                    color: 0x2A2340, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "blast", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [7, 13], size: [0.5, 0.08], sizeMode: "index",
                    color: 0x8A7BD0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "dome", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 4.2 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 16,
                    drag: 0.94,
                    lifetime: [10, 18], size: [0.44, 0.1], sizeMode: "sin",
                    color: 0x2A2340, alpha: [0.7, 0], light: "world", maxParticles: 180
                }
            ]
        },
        wave: {
            duration: 12,
            exit: { stop: 8, drain: 15 },
            emitters: [
                {
                    name: "front", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 4.2 } },
                    direction: "outward", speed: [0.03, 0.12], spread: 6,
                    lifetime: [9, 15], size: [0.5, 0.95], sizeMode: "sin",
                    color: 0x4A3E6E, alpha: [0.65, 0], light: "world", maxParticles: 160
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 4.2 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 14,
                    drag: 0.93,
                    lifetime: [10, 20], size: [0.4, 0.08], sizeMode: "sin",
                    color: 0x140F1E, alpha: [0.55, 0], light: "world", maxParticles: 220
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 4.2 } },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8A7BD0, alpha: [0.7, 0], light: "full", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "engulf", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.26], spread: 24,
                    lifetime: [6, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0x8A7BD0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "flakes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    drag: 0.93,
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x2A2340, alpha: [0.75, 0], light: "world", maxParticles: 110
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "shroud", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 6, shape: { kind: "circle", radius: 0.4 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.12, 0.03],
                    color: 0x140F1E, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        clear: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spread: 28,
                    drag: 0.92,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8A7BD0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "dissipate", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4.2 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.09],
                    drag: 0.92,
                    lifetime: [14, 26], size: [0.16, 0.04],
                    color: 0x2A2340, alpha: [0.4, 0], light: "world", maxParticles: 160
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "dud", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    drag: 0.92,
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x140F1E, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nightdaze", 1, NightdazeDefinition);
