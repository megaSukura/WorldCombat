/**
 * 气场之翼 / esperwing 的客户端表现。
 *
 * 一句话：背后先聚起一圈粉色气场，随后左右两翼各铺成半扇向前扫开，落点炸开粉色碎屑；同一瞬脚下浮起
 * 一圈提速光环，余韵里身后拖着粉色气点。
 * 色相家族：粉紫（psyswirl／impact_psychic／glowingsparkle_pink 的粉紫偏色）＋近白高光＋中性尘。
 * 拍子：起（windup 气场聚拢）→ 扫（wing 双翼铺开）→ 切（cut 命中爆）→ 托（aura 提速光环、linger 余韵）→ 强调（crit 要害）。
 * 范围：wing 用 `data.path`（与服务端 esperwingArc 同一组顶点）分别画出左右两个半扇面；两个半扇合起来就是判定范围。
 * 运动：windup 光点向背后收拢，wing 由翼根向扇缘扫开，cut 碎屑从目标向外爆，aura 用速度线向上冲、linger 缓缓拖尾。
 * 数：`data.motes`（特攻与速度换算）绑定翼面与命中的光点量；`data.aura` 是余韵时长；`data.gift` 决定提速光环的强度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const EsperwingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.8, -0.25], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 12, shape: { kind: "ring", radius: 0.6 }, direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xE8A8F0, alpha: [0.6, 0], light: "full", bloom: 0.4, maxParticles: 34
                }
            ]
        },
        wing: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wing_fill", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    shape: { kind: "polygon" }, rate: { data: "motes", fallback: 26 }, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 13], size: [0.26, 0.05],
                    color: 0xE8A8F0, alpha: [0.35, 0], light: "full", maxParticles: 130
                },
                {
                    name: "wing_edge", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.05, 0.16], spread: 6,
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFD8F8, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 100
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "wound", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "motes", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.07, 0.2], spread: 22,
                    lifetime: [6, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF0C8F8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "mote", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFE8FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        aura: {
            duration: 26,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 10, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.22, 0.04],
                    color: 0xE8A8F0, alpha: [0.6, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, at: 0 }, shape: { kind: "ring", radius: 0.5 }, direction: "up", speed: [0.08, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0xF0C8F8, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 34
                }
            ]
        },
        linger: {
            duration: { data: "aura", fallback: 80 },
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "wake", bind: "source", offset: [0, 0.45, 0], height: 0.35, trail: { minDistance: 0.4 },
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "point" }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.07, 0.02],
                    color: 0xF0C8F8, alpha: [0.5, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 16
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFD8F8, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "disperse", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xD8B8E0, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_esperwing", 1, EsperwingDefinition);
