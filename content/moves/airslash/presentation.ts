/**
 * 空气斩 / airslash 的客户端表现。
 *
 * 一句话：施法者身前把空气拢成一道将成未成的亮线，随后一道灰白月牙笔直掠出、身后拖着一线被切开的碎风，
 * 切中目标时爆开一圈风屑，被切懵的人身上再闪一下。
 * 色相家族：灰白与浅青（slash / small_gust 为主体，0xE8F4FA、0xC9DCE6），近白高光（0xFFFFFF）只给命中那一下。
 * 拍子：起（gather 拢风）→ 斩（flight 月牙掠出、拖碎风）→ 中（cut 命中爆风屑）→ 断（wallbreak 撞墙断刃）→ 懵（flinch）／空（miss）。
 * 范围：这一招只作用在刃线扫过的一条直线上；flight 的各层绑 `projectile` 锚点沿 projectile 真实轨迹铺开，画面即那条切割线，
 *   月牙贴 `slash` 的弯刃贴图（`appearance` 也用它），到哪画到哪。
 * 运动：gather 的风线向内收成一条；flight 的月牙沿 projectile 高速直行、碎风留在身后；cut／wallbreak 时风屑向外炸。
 * 数：`data.shards`（特攻与等级派生）决定碎风、命中风屑与断刃碎片的量，`data.intensity` 抬高命中亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AirslashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_line", bind: "source", offset: [0, 0.2, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 22, shape: { kind: "line", length: 1.1, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.05, 0.2], spread: 12, spin: 8,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 34
                },
                {
                    name: "gather_mist", bind: "source", offset: [0, 0.1, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xC9DCE6, alpha: [0.32, 0], light: "world", maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 40,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "blade", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 34, shape: { kind: "sphere", radius: 0.14 }, direction: "velocity", speed: [0.02, 0.1], spin: 16,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "wake", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    trail: { minDistance: 0.16 },
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: { data: "shards", fallback: 24 }, shape: { kind: "sphere", radius: 0.12 }, direction: "velocity", speed: [0.02, 0.12], spread: 10,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "full", maxParticles: 120
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "cut_burst", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "shards", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [7, 13], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "cut_shards", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: { data: "shards", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.14, 0.5], spread: 26,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0xDCE9F0, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        wallbreak: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "wall_crack", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 }, direction: "outward", speed: [0.12, 0.5], spread: 26,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE8F4FA, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "wall_gust", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xDCE9F0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], spread: 16,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xC9DCE6, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_airslash", 1, AirslashDefinition);
