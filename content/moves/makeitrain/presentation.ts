/**
 * 淘金潮 / makeitrain 的客户端表现。
 *
 * 一句话：施法者头顶翻涌起一片金光 → 一束束真金币从身上被抛起、沿真实弧线向四周散开再落下 →
 *   砸到敌人迸出金色钢花、被方块或屋檐截住的在接触面叮响 → 真正落地的少数硬币在地上闪一下。
 * 色相家族：金币金（0xFFD24A／0xFFE9A8）为主体，钢白（0xFFF6DC）只给命中高光。
 * 拍子：起 windup（头顶聚金）→ 抛 toss（每次抛出在起点炸一小簇金屑）→ 束 beam（沿真实弹体拖金流）→
 *   击 hit（命中敌人）／clink（被方块或已结算的敌人截住）→ 落 drop（真实终点的硬币闪光）。
 * 运动：弹体本身是可见的真金币（`data.projectile` 绑定），粒子只沿它拖尾；上抛与下落同一条真实轨迹。
 * 数：`data.intensity`（单束威力 / 120）放大金屑与命中，`data.scale`（覆盖半径 / 5）缩放整幕与命中，
 *   `data.beams`／`data.index` 标出这是第几束，`data.count` 绑落地硬币的闪光发数。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const MakeitrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 1.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 22, shape: { kind: "hemisphere", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.12], spin: 14,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xFFD24A, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "vault", bind: "source", offset: [0, 1.9, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 12, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 20], size: [0.18, 0.04],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        toss: {
            duration: 14,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "toss_spark", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.12, 0.34], spread: 18,
                    lifetime: [7, 13], size: [0.09, 0.02],
                    color: 0xFFD24A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 16
                }
            ]
        },
        beam: {
            duration: 120,
            exit: { stop: 120, drain: 18 },
            emitters: [
                {
                    name: "beam_stream", bind: "projectile", trail: { minDistance: 0.28 },
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "intensity", fallback: 12 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.03, drag: 0.99,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFD24A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "beam_orb", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "intensity", fallback: 6 }, shape: { kind: "sphere", radius: 0.13 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFD24A, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "hit_sparks", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10, at: 1, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFF6DC, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        clink: {
            duration: 14,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "clink", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.85, 0], light: "full", maxParticles: 14
                },
                {
                    name: "clink_dust", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.05, 0.01],
                    color: 0xD8B86A, alpha: [0.4, 0], light: "world", maxParticles: 12
                }
            ]
        },
        drop: {
            duration: 24,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "drop_glint", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 1 }, at: 0 },
                    shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xFFE9A8, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_makeitrain", 1, MakeitrainDefinition);
