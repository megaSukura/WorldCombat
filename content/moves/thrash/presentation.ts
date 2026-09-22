/**
 * 大闹一番 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者踏地抡起双臂，一圈琥珀色的冲势贴地荡开；每一次乱挥都把人朝外掀出去，
 *   最后一记重跺震起一圈尘土；闹完自己头顶转起眩晕的气流。
 * 色相家族：琥珀 0xC9A227 与近白 0xFFF0C0 为主，低饱和土黄 0x8A7A50 只做尘土与余韵；一个色相。
 * 层次：踏步蓄势（tempo）→ 环形乱挥（flail）→ 命中外掀（knock）→ 重跺（stomp）→ 磕伤（reckless）→ 收束眩晕（spent）→ 持续眩晕（dizzy）。
 * 范围：flail 的 `swing_ring` 用 `ring` 贴地画出一整圈，半径读 `data.scale` 对应的机制半径（服务端按判定半径派生），
 *   画出的圈就是会被扫到的范围。
 * 运动：冲势从圆心向外一圈圈推开；命中处再朝外炸一撮土；重跺向上掀起。
 * 数：服务端把 `data.dust`（尘土数）、`data.intensity`（威力）与 `data.scale`（乱挥半径）交给发射器，数量和强度按机制走。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ThrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stomp_prep", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0x8A7A50, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "arm_wind", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFF0C0, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        flail: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "swing_ring", bind: "source", offset: [0, 0.18, 0], height: 0.1, fit: "none", orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 26 }, shape: { kind: "ring", radius: 3.4 }, direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [10, 18], size: [0.9, 0.1], sizeMode: "sin",
                    color: 0xC9A227, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "swing_arc", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "body", spin: -20,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 8, repeats: 2, interval: 4 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.14, 0.3], drag: 0.88,
                    lifetime: [8, 14], size: [0.34, 0.08],
                    color: 0xFFF0C0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        knock: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "knock_dust", bind: "target", offset: [0, 0.15, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.12, 0.01],
                    color: 0x8A7A50, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        stomp: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shock", bind: "source", offset: [0, 0.12, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, interval: 6 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.88,
                    lifetime: [12, 22], size: [1.2, 0.1], sizeMode: "sin",
                    color: 0xC9A227, alpha: [0.6, 0], light: "world", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "stomp_dust", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 }, repeats: 3, interval: 3 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.12, 0.32],
                    lifetime: [12, 22], size: [0.12, 0.01],
                    color: 0x8A7A50, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        reckless: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "chip", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dizzy", bind: "source", offset: [0, 1.1, 0], height: 0.2, fit: "body", spin: 12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 10, repeats: 2, interval: 8 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        punish: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dizzy: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "dizzy_loop", bind: "source", offset: [0, 1.1, 0], height: 0.15, fit: "body", spin: 9,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.18, 0.05],
                    alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thrash", 1, ThrashDefinition);
