/**
 * 水波刀 / aquacutter 的客户端表现。
 *
 * 一句话：口边先收成一道低鸣的细线，随后一道加压的水线笔直喷出、拖着一串细水尾与泡沫；切中目标时
 * 水花炸开、目标被淋透，暴击时水花更亮更白。
 * 色相家族：青蓝（waterjet／bubble／impact_water）＋近白泡沫（smallbubble／white）。
 * 拍子：起（windup 蓄压）→ 喷（jet 水线飞行、拖尾）→ 切（cut 命中水花）→ 强调（crit）。
 * 范围：`data.scale` 与水线判定半径同源；jet 的 `trail` 正好沿水线飞过的路线铺开，画面即那条笔直的切割线。
 * 运动：水线从口边沿 projectile 绑定笔直高速前进，命中处水花向外炸、泡沫上浮，余水慢慢落下。
 * 数：`data.spray`（速度换算的水花量）绑定命中与暴击的水花量；`data.intensity` 决定亮度；`data.hits` 让第几段切割可读。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AquacutterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "squeeze", bind: "source", offset: [0, 0.55, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.32 }, direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x7FD6F2, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 28
                },
                {
                    name: "press_line", bind: "source", offset: [0, 0.55, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smallbeam_cyan",
                    rate: 14, shape: { kind: "line", length: 0.5, rotation: [90, 0, 0] }, direction: "shape", speed: [0.02, 0.06],
                    lifetime: [5, 10], size: [0.2, 0.05],
                    color: 0xBFF0FF, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        jet: {
            duration: 20,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "water_head", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 30, shape: { kind: "sphere", radius: 0.16 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.26, 0.05], spin: 6,
                    color: 0x66D2F0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "water_wake", bind: "projectile", offset: [0, 0, 0],
                    trail: { minDistance: 0.14 },
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 44, shape: { kind: "sphere", radius: 0.14 }, direction: "outward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 130
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "splash_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "spray", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.26], spread: 26,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x8FE0F5, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "splash_fall", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/splash",
                    burst: { count: 16, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.1, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xBFEFFA, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_spray", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "spray", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.09, 0.3], spread: 30,
                    lifetime: [7, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                },
                {
                    name: "vital_foam", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 18, at: 0 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], gravity: -0.02,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xE8FAFF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.08,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x8FC6D8, alpha: [0.35, 0], light: "world", maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aquacutter", 1, AquacutterDefinition);
