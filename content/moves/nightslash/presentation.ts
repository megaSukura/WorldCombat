/**
 * 暗袭要害 / nightslash 的客户端表现。
 *
 * 一句话：脚下先卷起一圈暗影，随后一缕影线从中牵到对手身前，顺着影线在它身上切出一道暗痕；
 * 切中空门时暗痕更亮，真切中要害时再闪一记亮紫。
 * 色相家族：冷紫与近黑（impact_dark／obscuringsmoke／swipe 的暗紫偏色）＋中性尘（tinydust）＋亮紫的一点强调。
 * 拍子：伏（windup 暗影收拢）→ 牵（thread 影线牵出）→ 斩（cut 命中爆、seam 空门强调）→ 强调（crit 要害）。
 * 范围：thread 用 `data.path`（与服务端同一段从脚下到目标的影线）画出这一刀够到哪；线到哪就打到哪。
 * 运动：windup 暗影向脚下收拢，thread 沿线由脚下扫向目标，cut 碎屑从落点向外爆。
 * 数：`data.motes`（物攻与速度换算）绑定影线与命中的碎屑量；`data.scale`／`data.intensity` 让伏击式更亮更重。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const NightslashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "ring", radius: 0.5 }, direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0x3A2E5C, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        thread: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 20 }, direction: "shape", speed: [0.03, 0.14], spread: 10,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x6E5AA8, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "seam_line", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polyline" }, rate: 22, direction: "shape", speed: [0.05, 0.16],
                    lifetime: [4, 9], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x8A6FD0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "wound", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.07, 0.2], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x7A62C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "shadow_dust", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x4A4258, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        seam: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "seam_flash", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 }, direction: "outward", speed: [0.06, 0.2], spread: 26,
                    lifetime: [8, 15], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xB98CF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
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
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xC9A8FF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A8296, alpha: [0.32, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nightslash", 1, NightslashDefinition);
