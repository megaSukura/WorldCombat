/**
 * 爆音波 / boomburst 的客户端表现。
 *
 * 一句话：施法者先憋住一口气，身周的空气与尘点被压着吸拢，随后一圈声压球猛地整圈炸开，
 * 被波及的地方气浪向外翻卷，最后身周荡开几圈余响。
 * 色相家族：冷白与青灰（sonicboom / giantring_white / xlring / impact_normal / orb / tinydust）为主体，
 * 近白只做声压球核心的强调。
 * 拍子：起（charge 压气吸尘）→ 爆（burst 声压球炸开、hit 逐处轰中并被吹飞）→ 收（ringing 余响 / miss 落空）。
 * 范围：charge / burst / ringing 的地面圈按服务端传的 `data.radius`（真实波及半径）画出，玩家看到的圈就是会被轰到的地。
 * 运动：起手尘点与气旋向内收束，炸开时声压球向外高速翻卷、被轰中的人身上再向同一方向甩出一蓬。
 * 数：`data.rings`（特攻与等级派生）决定余响环数，`data.marks`（威力派生）决定炸开的高光量，
 * `data.cells`（半径派生）决定气浪尘量，`data.flow`（半径派生）决定环上密度，`data.count`（本次威力×距离派生）决定命中量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BoomburstDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "pull", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "inward", speed: [0.05, 0.2], spread: 18,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xB8B8C0, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "compress", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.06, 0.22], spread: 14,
                    lifetime: [12, 20], size: [0.4, 0.15],
                    color: 0xC8C8D0, alpha: [0.4, 0], light: "world", maxParticles: 50
                },
                {
                    name: "cupped", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 12, shape: { kind: "ring", radius: { data: "area", fallback: 4.8 } },
                    direction: "inward", speed: [0.03, 0.1], spread: 10,
                    lifetime: [10, 18], size: [0.24, 0.08],
                    color: 0xE8E8F0, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "shock", bind: "source", height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: { data: "rings", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [10, 18], size: [1.2, 2.2], sizeMode: "index",
                    color: 0xF0F0FF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 24
                },
                {
                    name: "sphere", bind: "source", height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: { data: "rings", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 4.8 } },
                    direction: "outward", speed: [0.2, 0.6], spread: 16,
                    lifetime: [10, 18], size: [0.8, 1.4],
                    color: 0xE8E8F8, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "wave", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/xlring",
                    rate: { data: "flow", fallback: 90 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.8 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 8,
                    lifetime: [10, 18], size: [0.9, 1.6], sizeMode: "linear",
                    color: 0xE0E0F0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 140
                },
                {
                    name: "core", bind: "source", height: 0.6, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "marks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "air", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 80 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4.8 }, thickness: 0.9 },
                    direction: "outward", speed: [0.2, 0.6], spread: 16,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0x9A9AA8, alpha: [0.45, 0], light: "world", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "count", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [6, 12], size: [0.45, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "shove", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.25, 0.7], spread: 24,
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0xD8D8E8, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1], spread: 6,
                    lifetime: [10, 16], size: [0.4, 0.7], sizeMode: "linear",
                    color: 0xE8E8F8, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        ringing: {
            duration: 40,
            exit: { stop: 14, drain: 28 },
            emitters: [
                {
                    name: "tone", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/xlring",
                    rate: { data: "flow", fallback: 50 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4.8 } },
                    direction: "outward", speed: [0.01, 0.05], spread: 8,
                    lifetime: [16, 28], size: [0.7, 1.2], sizeMode: "linear",
                    color: 0xD8D8E8, alpha: [0.28, 0], light: "full", maxParticles: 80
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    rate: 10, shape: { kind: "circle", radius: { data: "radius", fallback: 4.8 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [18, 30], size: [0.06, 0.01],
                    color: 0xE0E0F0, alpha: [0.25, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "puff", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.2], spread: 14,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 20], size: [0.2, 0.05],
                    color: 0xB8B8C0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_boomburst", 1, BoomburstDefinition);
