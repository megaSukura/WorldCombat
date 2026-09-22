/**
 * 子弹拳 / bulletpunch 的客户端表现。
 *
 * 一句话：拳头一沉、金属光在拳面收拢，随即沿瞄准方向炸出一发钢拳——一条笔直的火花线打出去，撞到谁就在谁身上
 *   迸开一圈钢花；打穿到后面的人时，火花线继续延伸、再叠一圈。线内无人时只有一声空击的火星。
 * 色相家族：冷钢一族（0xC8D4E0 主体、0xEAF0F6 高光、0x7C8794 暗钢），火花用暖白点缀（0xFFE8B0）以读出「击发」。
 * 拍子：起 chamber（蓄拳）→ 发 fire（火花线与拳影）→ 击 hit（钢花爆开）／穿 pierce（叠第二圈）→ 收 whiff。
 * 范围：fire 的窄线用 `data.path`（与服务端 WorldGeometry.lane 同一组方向）铺出，线多宽多长画面就是那块。
 * 运动：火花沿 `data.direction` 直线射出，撞点向外迸开、金属屑向下沉；拳影沿运动方向甩出。
 * 数：fire 与 hit 的火花量绑定 `data.sparks`（速度换算），尺度绑定 `data.scale`（贯穿半宽换算），
 *   亮暗绑定 `data.intensity`（钢拳威力换算）；贯穿叠圈由 `data.index` 区分。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BulletpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        chamber: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "chamber_glint", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xEAF0F6, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 34
                },
                {
                    name: "chamber_fist", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.28, 0.1], sizeMode: "index",
                    color: 0xC8D4E0, alpha: [0.7, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fire: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fire_line", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.04, 0.18], spread: 6,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF0F6, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "fire_muzzle", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [5, 10], size: [0.5, 1.1], sizeMode: "index",
                    color: 0xFFE8B0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "fire_spark", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smallhit",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 20 },
                    direction: "shape", orient: "velocity", speed: [0.1, 0.4], spread: 14,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFFE8B0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "hit_steel", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.6, 1.3], sizeMode: "index",
                    color: 0xEAF0F6, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "hit_spark", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smallhit",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [7, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFFE8B0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "hit_ring", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [7, 13], size: [0.3, 0.62],
                    color: 0xC8D4E0, alpha: [0.5, 0], light: "world", maxParticles: 6
                }
            ]
        },
        pierce: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "pierce_ring", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [6, 12], size: [0.28, 0.58],
                    color: 0xEAF0F6, alpha: [0.55, 0], light: "full", maxParticles: 6
                },
                {
                    name: "pierce_spark", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smallhit",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.36], spread: 26,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xFFE8B0, alpha: [0.8, 0], light: "world", maxParticles: 44
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff_spark", bind: "point", fit: "none", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC8D4E0, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bulletpunch", 1, BulletpunchDefinition);
