/**
 * 空气利刃 / aircutter 的客户端表现。
 *
 * 一句话：施法者身前的空气先被拉成几道将成未成的细缝，随后一整片灰白风刃贴着地面向扇区铺开、扫过里面的每个目标，
 * 切中时在目标身上爆开一圈风屑。
 * 色相家族：灰白与浅青（slash / small_gust 为主体，0xE8F4FA、0xC9DCE6），近白高光（0xFFFFFF）只给命中与暴击那一下。
 * 拍子：起（gather 拢缝）→ 扇（sweep 扇面铺开、细刃扫过）→ 中（cut 命中爆风屑）→ 强调（crit）。
 * 范围：sweep 的水平扇形用 `data.reach` 当半径、`data.span` 当张角，画出来的扇面就是判定真罩到的扇区。
 * 运动：gather 的缝向内收成一条；sweep 的风刃在水平扇面贴着地面朝目标方向铺开、细刃向外抽；cut 时风屑向外炸。
 * 数：`data.edges`（速度派生）决定一次张开甩出几道细刃，`data.shards`（特攻派生）决定命中风屑量，
 * `data.intensity` 抬高亮度；`data.hits` 让第几刀可读。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AircutterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_seams", bind: "source", offset: [0, 0.5, 0.25], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 24, shape: { kind: "line", length: 1.0, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.05, 0.2], spread: 12, spin: 9,
                    lifetime: [8, 15], size: [0.15, 0.03],
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 32
                },
                {
                    name: "gather_mist", bind: "source", offset: [0, 0.15, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 11, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0xC9DCE6, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        },
        sweep: {
            duration: 22,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "fan_fill", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 54, shape: { kind: "sector", radius: { data: "reach", fallback: 8 }, angleDegrees: { data: "span", fallback: 92 } },
                    direction: "shape", speed: [0.03, 0.14], spread: 10,
                    lifetime: [8, 15], size: [0.15, 0.03],
                    color: 0xDCE9F0, alpha: [0.32, 0], light: "full", maxParticles: 120
                },
                {
                    name: "fan_blades", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: { data: "edges", fallback: 7 }, at: 0, interval: 1, repeats: 2 },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 8 }, angleDegrees: { data: "span", fallback: 92 } },
                    direction: "shape", speed: [0.3, 0.7], spread: 8, spin: 14,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "fan_wake", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    rate: 26, shape: { kind: "sector", radius: { data: "reach", fallback: 8 }, angleDegrees: { data: "span", fallback: 92 } },
                    direction: "shape", speed: [0.02, 0.1], spread: 14,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xC9DCE6, alpha: [0.22, 0], light: "full", maxParticles: 70
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "cut_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "shards", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.08, 0.32], spread: 24,
                    lifetime: [6, 12], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "cut_shards", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: { data: "shards", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.12, 0.44], spread: 26,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xDCE9F0, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        crit: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "shards", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.1, 0.38], spread: 30,
                    lifetime: [7, 14], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 16, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xC9DCE6, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aircutter", 1, AircutterDefinition);
