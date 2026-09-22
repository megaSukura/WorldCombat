/**
 * 小偷 / thief 的客户端表现。
 *
 * 一句话：施法者低伏探手，沿地面掠出一条暗色残影，撞上目标的一刻在接触点炸开一蓬暗紫火花；
 * 若得手，那件道具自带贴图沿一条归巢弧线飞回施法者，指尖闪一点金色。
 * 色相家族：暗紫（smoke / impact_dark）为主，近白细节（tinydust）作衬，金色（sparkle）只在“得手”那一小处出现。
 * 拍子：起（reach 探手）→ 击（strike 暗爆）→ 得（snatch 抓取弧线）／空（miss 收势尘）。
 * 范围：reach 的残影沿施法者实际掠过的轨迹铺开；strike 绑命中点，画出的就是被打中的位置。
 * 运动：探手时指尖向内聚火花，掠行中拖一条贴地残影与速度线，命中是短促外爆，道具走一条归巢弧线。
 * 数：`data.motes`（速度派生的火花数）驱动掠行与命中的粒子量；`data.intensity`（本击伤害占比）由引擎放大爆发亮度与密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ThiefDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 22,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 26, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [5, 11], size: [0.07, 0.015],
                    color: 0x6B4A86, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.7, 0.25], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 3, interval: 4, repeats: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8C56A, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE9DDF4, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "sparks", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.02,
                    lifetime: [7, 15], size: [0.06, 0.01],
                    color: 0x8A66A8, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 1 }, shape: { kind: "arc", radius: 0.5, arcDegrees: 160, rotation: [0, 0, 35] },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: 10, size: [0.5, 0.1],
                    color: 0xC9AEE0, alpha: [0.8, 0], light: "full", maxParticles: 4
                }
            ]
        },
        snatch: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "grip", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0x5A3E70, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "homebound", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 44, shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0xF0D27A, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "acquired", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6, at: 8 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x7A6A88, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thief", 1, ThiefDefinition);
