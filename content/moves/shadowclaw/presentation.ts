/**
 * 暗影爪 / shadowclaw 的客户端表现。
 *
 * 一句话：脚下的影子朝对手身后铺成一条暗带，一只近黑的爪从暗带末端反向抓回目标；命中处散出幽暗碎屑、
 * 在目标身上留一道影痕，暴击时影痕亮成要害的白点。
 * 色相家族：近黑紫（impact_ghost／orb／smoke）＋中性暗尘（tinydust）＋白亮要害强调（smallsparkle／critical_hit）。
 * 拍子：起（windup 脚边收影）→ 铺（shade 暗带铺过目标）→ 抓（rend 爪反向抓回、命中）→ 留（gouge 影痕）→ 强调（crit）。
 * 范围：`data.path` 是服务端影子铺出的同一组顶点；shade 用 polygon 填出暗带，rend 用 polyline 画爪反向抓的落点。
 * 运动：暗带从脚下沿 path 铺向目标身后，爪痕由暗带末端反向划到目标；命中碎屑向外爆，影痕原地慢慢变淡。
 * 数：`data.shred`（物攻换算的崩屑量）绑定命中与暗带边缘的量；`data.scale` 让宽爪比窄爪更大；
 *   要害标记的数量与尺寸读 `data.marks`（实际伤害换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShadowclawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.06, 0.1], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 14, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x6B4FA8, alpha: [0.65, 0], light: "world", maxParticles: 24
                }
            ]
        },
        shade: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "band_fill", bind: "path", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    shape: { kind: "polygon" }, rate: { data: "shred", fallback: 18 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.34, 0.08],
                    color: 0x2E2340, alpha: [0.42, 0], light: "world", maxParticles: 120
                },
                {
                    name: "band_edge", bind: "path", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    shape: { kind: "polyline" }, rate: 22, direction: "shape", speed: [0.03, 0.1], spread: 6,
                    lifetime: [5, 10], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x8E6FD0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 80
                }
            ]
        },
        rend: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "claw_stroke", bind: "path", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.05, 0.18], spread: 6,
                    lifetime: [5, 10], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xD9C8F4, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 100
                },
                {
                    name: "rake_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "shred", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22,
                    lifetime: [6, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xB79BE8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 64
                },
                {
                    name: "rake_dust", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x5A5270, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        gouge: {
            duration: { data: "gouge", fallback: 60 },
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mark", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 6, shape: { kind: "line", length: 0.7, rotation: [0, 0, 38] },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0x5A3E94, alpha: [0.4, 0], light: "world", maxParticles: 30
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
                    burst: { count: { data: "marks", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 20
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.07, 0.24], spread: 28,
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEADFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 32
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "path", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, rate: 16, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x6E5E8A, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shadowclaw", 1, ShadowclawDefinition);
