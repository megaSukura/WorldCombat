/**
 * 神速 / extremespeed 的客户端表现。
 *
 * 一句话：地面被蹬出一圈白环、身体拉成一整条残影直线射出去，撞上的一刻在接触点炸开一记巨大的白色冲击环，
 *   贯穿式还会从对方身上再拉出一段较淡的残影光带停在它身后；最后在真实停住的位置扬起一撮急收的尘收势；
 *   伤害被拒时接触点只收拢一圈黯淡的拒绝微光（无伤害闪）；冲空时只在前方地上留下一撮被带起的尘与散去的速度线。
 * 色相家族：冷白偏蓝（0xEAF2FF / 0xBFC8FF），亮心近白，尘用中性暖灰，拒绝用中性灰（0xC6CED9）；没有第二组色相。
 * 拍子：起 charge（蹬地拉影）→ 冲 leap（整条残影直线）→ 击 ram（巨大白环）→ 穿 through（身后淡残影）→ 收 brake（急收尘）／拒 blocked／空 miss。
 * 范围：leap 的残影沿施法者实际走过的轨迹铺开，就是判定扫过的那条长线；ram 绑命中点画在接触处，brake 绑真实停住的位置。
 * 运动：起手是贴地向外蹬开的环，冲刺是把残影与速度线甩在身后，命中是向外扩张的巨大白环，
 *   贯穿是身体带着淡残影从目标身上穿过去继续拉线，收势是在停住处腾起一撮向外的尘。
 * 数：leap 的残影道数绑定 `data.wake`（速度换算），ram 的冲击量绑定 `data.count`（撞击威力换算），
 *   亮度绑定 `data.intensity`（撞击威力 / 85），贯穿与收势的残影密度同样绑定 `data.wake`。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ExtremespeedDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 8 },
            emitters: [
                {
                    name: "kick_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.5, 1.4],
                    color: 0xEAF2FF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 4
                },
                {
                    name: "wake_up", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.06, 0.22],
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        leap: {
            duration: 44,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "afterimage", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0, interval: 4, repeats: 8 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "away", speed: [0.08, 0.3], spread: 12,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.85, 0], light: "full", maxParticles: 160
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 60, trail: { minDistance: 0.2 },
                    shape: { kind: "point" },
                    direction: "away", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.22, 0.04],
                    color: 0xEAF2FF, alpha: [0.6, 0], light: "full", maxParticles: 200
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xB6BCC9, alpha: [0.45, 0], light: "world", maxParticles: 140
                }
            ]
        },
        ram: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "shock_ring", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 15], size: [0.7, 2.2],
                    color: 0xEAF2FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 5
                },
                {
                    name: "core", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.1, 0.34],
                    lifetime: [5, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF8EC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "shadow", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.4], spread: 24,
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        through: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "aftershock", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0, interval: 2, repeats: 6 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "away", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "trail_spark", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    rate: 12, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xEAF2FF, alpha: [0.45, 0], light: "full", maxParticles: 60
                }
            ]
        },
        brake: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [7, 14], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xB6BCC9, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "halt", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.03, 0.12],
                    lifetime: [4, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reject", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.4, 0.9],
                    color: 0xC6CED9, alpha: [0.5, 0], light: "world", maxParticles: 4
                },
                {
                    name: "guard_spark", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "inward", speed: [0.04, 0.14], spread: 24,
                    gravity: 0.04, drag: 0.93,
                    lifetime: [5, 10], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xB6BCC9, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "overrun", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xB6BCC9, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "fade_lines", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "wake", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xBFC8FF, alpha: [0.5, 0], light: "full", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_extremespeed", 1, ExtremespeedDefinition);
