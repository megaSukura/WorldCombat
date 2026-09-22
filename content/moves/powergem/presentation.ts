/**
 * 力量宝石 / powergem 的客户端表现。
 *
 * 一句话：光在施法者身前收成一枚宝石焦点、碎晶朝它聚拢 → 一条又细又长的宝石光线沿瞄准方向射出，
 *   线两侧闪着彩虹碎光 → 光贯穿到谁，谁身上就崩出一簇结晶与碎屑；射程尽头留下一圈余光。
 * 色相家族：宝石的青白（0xBFE8FF / 0xEDF7FF）为主体，彩虹只做小面积的折射碎光，灰蓝（0x9FB6C8）收在碎屑。
 * 拍子：起 gather（聚晶）→ 射 beam（光线贯穿）→ 击 hit（崩出碎晶）→ 收 fade（尽头余光）。
 * 范围：beam 用与判定同一起止的 `data.path` 画这条线；玩家一眼看出站在哪条走廊上会被贯穿。
 * 运动：光线沿 `data.direction` 笔直射出，附着的碎光沿同方向掠过，尽头停在被方块挡住的位置。
 * 数：束宽直接绑定 `data.width`（粗细，碰撞箱换算），碎晶量绑定 `data.shards`（特攻与等级换算），亮度绑定 `data.intensity`（威力换算）。
 */
const PowerGemDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 13 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xBFE8FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "gather_gem", bind: "source", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1], spin: 8,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.55, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, repeats: 4, interval: 3 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [6, 12], size: [0.24, 0.12], sizeMode: "linear",
                    color: 0xEDF7FF, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        beam: {
            duration: 26,
            exit: { stop: 16, drain: 14 },
            emitters: [
                {
                    name: "beam_core", bind: "path", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: { data: "width", fallback: 0.5 },
                    color: 0xBFE8FF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "beam_edge", bind: "path", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.06, 0.18], spread: 6,
                    lifetime: [5, 9], size: [0.14, 0.05],
                    color: 0xEDF7FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "beam_refract", bind: "path", fit: "none", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    rate: 20, direction: "shape", speed: [0.08, 0.26], spread: 12,
                    lifetime: [8, 14], size: [0.11, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "beam_muzzle", bind: "point", fit: "none", offset: [0, 0.6, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.3, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0xBFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 6
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: 2, interval: 2, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEDF7FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "hit_shards", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 26,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x9FB6C8, alpha: [0.85, 0], light: "world", maxParticles: 48
                },
                {
                    name: "hit_gems", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "hit_ring", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.26, 0.7],
                    color: 0xBFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 6
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade_end", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.25 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.5],
                    color: 0xBFE8FF, alpha: [0.4, 0], light: "world", maxParticles: 4
                },
                {
                    name: "fade_motes", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.02, drag: 0.95,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xEDF7FF, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powergem", 1, PowerGemDefinition);
