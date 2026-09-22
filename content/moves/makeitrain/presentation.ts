/**
 * 淘金潮 / makeitrain 的客户端表现。
 *
 * 一句话：施法者头顶翻涌起一片金光 → 金币从上方一圈圈向四周砸落，铺满整个覆盖圈 →
 *   被砸中的敌人身上迸出金色钢花 → 雨停后地面留下一片闪光的金币。
 * 色相家族：金币金（0xFFD24A／0xFFE9A8）为主体，钢白（0xFFF6DC）只给命中高光。
 * 拍子：起 windup（头顶聚金）→ 雨 downpour（逐圈扩张砸落）→ 击 hit（逐个命中）→ 收 settle（地面金光）。
 * 范围：downpour 与 settle 的圆面半径就是判定的覆盖半径（`data.radius` / `data.full`），
 *   玩家一眼看出站在圈里就会被砸到。
 * 运动：金币从高处（offset 抬高）垂直砸下，外圈一圈比一圈远；地面金环随雨扩张。
 * 数：密度绑定 `data.density`（金币总数派生），雨圈数绑定 `data.waves`，地面真币闪光绑定 `data.scatter`，
 *   强度绑定 `data.intensity`（单发威力 / 120）。
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
        downpour: {
            duration: 40,
            exit: { stop: 18, drain: 22 },
            emitters: [
                {
                    name: "sky_glint", bind: "point", fit: "none", offset: [0, 5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "density", fallback: 20 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 5 } },
                    direction: "down", speed: [0.5, 1.2], spread: 8, gravity: 0.05,
                    lifetime: [18, 34], size: [0.1, 0.02],
                    color: 0xFFD24A, alpha: [0.85, 0], light: "full", maxParticles: 600
                },
                {
                    name: "sky_coin", bind: "point", fit: "none", offset: [0, 5.4, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: { data: "density", fallback: 16 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 5 } },
                    direction: "down", speed: [0.6, 1.4], spread: 6, gravity: 0.06,
                    lifetime: [16, 30], size: [0.16, 0.03],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 400
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 5 } },
                    direction: "outward", speed: [0.0, 0.06],
                    lifetime: [8, 16], size: [0.3, 0.9],
                    color: 0xFFD24A, alpha: [0.5, 0], light: "world", maxParticles: 30
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
                    burst: { count: { data: "density", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFD24A, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "hit_sparks", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "density", fallback: 12 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFF6DC, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "ground_glint", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "scatter", fallback: 4 }, interval: 3, repeats: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 5 } },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFE9A8, alpha: [0.75, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_makeitrain", 1, MakeitrainDefinition);
