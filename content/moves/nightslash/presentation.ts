/**
 * 暗袭要害 / nightslash 的客户端表现。
 *
 * 一句话：脚下先卷起一圈暗影、刀收在肩侧，随后窄刀路从肩侧斜下扫到第一个真实接触，在接触点切出一道暗痕；
 * 切中空门时暗痕更亮，真切中要害时再闪一记亮紫。
 * 色相家族：冷紫与近黑（impact_dark／obscuringsmoke／swipe 的暗紫偏色）＋中性尘（tinydust）＋亮紫的一点强调。
 * 拍子：伏（windup 收刀聚影）→ 斩（cut 沿真实刀路斜下、接触点爆）→ 强调（seam 空门、crit 要害）。
 * 范围：cut 用 `data.path`（与服务端 `action.trace` 同一段肩侧到真实接触的窄刀路）画出这一刀落到哪；线到哪就打到哪。
 * 运动：windup 暗影向肩侧收拢，cut 沿线由肩侧斜下扫向接触点，接触点碎屑向外爆。
 * 数：`data.motes`（物攻与速度换算）绑定刀路与命中的碎屑量；`data.scale`／`data.intensity` 让伏击式更亮更重。
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
        cut: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "edge", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 18 }, direction: "shape", speed: [0.05, 0.16], spread: 8,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0x8A6FD0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "wound", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: { data: "motes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.06, 0.18], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x7A62C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "shadow_dust", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x4A4258, alpha: [0.4, 0], light: "world", maxParticles: 26
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
