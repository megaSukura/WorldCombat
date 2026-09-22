/**
 * 水之波动 / waterpulse 的客户端表现。
 *
 * 一句话：一颗低鸣的水珠在身前收成后飞出，命中处炸起水花，随后一圈圈同心水波从落点向外荡开，
 * 每荡过一个人就在他身上溅起一层水幕；被震到的人头顶转起水环与飞鸟。
 * 色相家族：水蓝（0x4FB6E8）与泡沫白（0xDEF4FF）；饱和只出现在水珠与命中的小面积。
 * 拍子：起 gather（收珠）→ 飞 flight（泡沫尾迹）→ 击 burst（水花）→ wave（一圈圈荡开，一拍一环）→ 收 soak／daze。
 * 范围：wave 的每一环用 `data.radius`（机制算出的这一圈半径）铺成环，最外圈就是振鸣半径，玩家一眼看出站哪会被扫到。
 * 运动：水珠沿直线飞（服务端速度），水波沿地面向外扩散，飞鸟在耳鸣目标头顶绕圈。
 * 数：wave 的水环条数等于机制里的 `pulses` 圈（服务端逐圈发一条），每环的水点数绑定 `data.flows`，
 *    强度绑定命中威力；水珠大小由 `data.scale`（振鸣半径 / 2.6）放大。
 */
const WaterpulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "bead", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 6, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.28, 0.16],
                    color: 0x4FB6E8, alpha: [0.85, 0.1], light: "full", maxParticles: 22
                },
                {
                    name: "foam", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xDEF4FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "orb", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    trail: { minDistance: 0.3 }, rate: 20,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.28, 0.18],
                    color: 0x4FB6E8, alpha: [0.9, 0], light: "full", maxParticles: 36
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    trail: { minDistance: 0.25 }, rate: 18,
                    direction: "velocity", speed: [0.0, 0.03], spread: 18,
                    drag: 0.94,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xDEF4FF, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.26], spread: 20,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "sheet", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.34], spread: 10,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.28, 0.04],
                    color: 0x4FB6E8, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "fizz", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 24 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xDEF4FF, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        wave: {
            duration: 20,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
                    burst: { count: { data: "flows", fallback: 40 } },
                    direction: "outward", speed: [0.03, 0.14], spread: 8,
                    lifetime: [8, 14], size: [0.22, 0.06], sizeMode: "index",
                    color: 0x4FB6E8, alpha: [0.75, 0], light: "world", maxParticles: 160
                },
                {
                    name: "crest", bind: "point", fit: "none", offset: [0, 0.22, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.5 } },
                    burst: { count: 18 },
                    direction: "outward", speed: [0.05, 0.2], spread: 6,
                    lifetime: [6, 11], size: [0.3, 0.08],
                    color: 0xDEF4FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        soak: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "douse", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 24,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x4FB6E8, alpha: [0.85, 0], light: "world", maxParticles: 40
                }
            ]
        },
        rattle: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "ring", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [12, 20], size: [0.18, 0.04],
                    color: 0xDEF4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        daze: {
            duration: 0,
            emitters: [
                {
                    name: "hum", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 5, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.16, 0.03],
                    color: 0x4FB6E8, alpha: [0.5, 0], light: "full", maxParticles: 18
                },
                {
                    name: "birds", bind: "target", height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [14, 22], size: [0.16, 0.03],
                    color: 0xDEF4FF, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_waterpulse", 1, WaterpulseDefinition);
