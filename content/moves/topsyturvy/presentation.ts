/**
 * 颠倒 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者身前聚起一枚冷银镜片，脱手后拖着一道细碎银蓝尾迹沿直线飞向目标；命中那一刻，
 *   目标周身炸开一圈镜屑与一道翻面的银环——翻过的项数越多，炸得越亮越密。
 * 色相家族：冷银蓝（0xBFE3FF / 0x8FB8E8）为主体与尾迹，近白（0xEAF4FF）只做小面积高光；一个色相家族。
 * 拍子：起（gather 镜片聚拢）→ 击（shot 尾迹掠过、flip 镜屑炸开与翻面银环）→ 收（shatter／guard 碎光散去）。
 * 范围：flip 绑命中目标、按 `data.scale`（体型参考）缩放那圈镜屑，玩家看到目标身上炸开多大就知道翻面波及多大；
 *   shatter 绑落点 `point`，半径随 `data.scale`。
 * 运动：shot 的尾迹绑 `data.projectile` 跟着镜片本体的速度走；flip 的镜屑由内向外翻出、银环向外扩。
 * 数：镜屑量按 `data.shards`（特攻换算的镜片数）派生，命中亮度按 `data.flipped`（真正翻过的项数）派生。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const TopsyturvyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_orb", bind: "source", height: 0.55, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.2, 0.04],
                    color: 0xBFE3FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_glint", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [7, 12], size: [0.07, 0.01],
                    color: 0xEAF4FF, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        shot: {
            duration: 24,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "shot_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    rate: 70, shape: { kind: "point" }, direction: "velocity", speed: [0.0, 0.02],
                    trail: { minDistance: 0.28 },
                    lifetime: [8, 15], size: [0.16, 0.02], sizeMode: "linear",
                    color: 0xBFE3FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "shot_dust", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 36, shape: { kind: "sphere", radius: 0.16 }, direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 11], size: [0.05, 0.01],
                    color: 0x8FB8E8, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flip: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "flip_shards", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [10, 18], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xBFE3FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "flip_ring", bind: "target", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.4, 0.9], sizeMode: "linear",
                    color: 0xEAF4FF, alpha: [0.9, 0], light: "full", maxParticles: 8
                },
                {
                    name: "flip_flash", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "flipped", fallback: 0 }, repeats: 6, interval: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.09, 0.01],
                    color: 0xEAF4FF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        guard: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "guard_scatter", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shards", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0x8FB8E8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        shatter: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "shatter_burst", bind: "point", height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "shards", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xBFE3FF, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "shatter_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.3, 0.7], sizeMode: "linear",
                    color: 0x8FB8E8, alpha: [0.6, 0], light: "world", maxParticles: 6
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_topsyturvy", 1, TopsyturvyDefinition);
