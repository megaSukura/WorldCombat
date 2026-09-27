/**
 * 烦恼种子 / worryseed 的客户端表现。
 *
 * 一句话：手心里鼓起一颗种子、身边绕着几颗同样的种子 → 种子脱手拖着细尾迹飞向选中的身体 → 命中处根须破土、
 *         炸开一撮嫩叶，头顶从此长出一枚小顶芽，随真实标记一直挂着；标记被清除/期满时顶芽落下叶片散去。
 *         如果这一下把睡着的目标叫醒，头上再亮一次睁眼。
 * 色相家族：种壳绿 0x8FBF4A 作主体，嫩芽黄绿 0xE8FF9B 作高光。
 * 拍子：起 gather 0–12t ／ 飞 toss 40t（沿 projectile 绑定）／ 击 plant 40t ／ 顶芽 sprout（随标记）／
 *       醒 wake 30t ／ 落 shed 22t ／ 空 miss 24t。
 * 范围：plant 的空土环按 `data.scale`（种子半径比）铺开，画出这颗种子砸到多大一块；根须沿 `data.roots` 条数从地面向上炸开。
 * 运动：种子绕手慢转、脱手后沿轨迹飞、命中时根须向上顶、顶芽在头顶持续飘叶、醒来时头顶向外炸开一圈光、落时叶片下沉。
 * 数：种子数绑 `data.seeds`（特攻派生），根须数绑 `data.roots`（特攻与体重派生），顶芽叶片数绑 `data.leaves`（等级派生），
 *   顶芽大小绑 `data.sprout`（深植更大），醒来的光点数绑 `data.glints`（心绪派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const WorryseedSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "seed_hand", bind: "source", fit: "body", offset: [0, 0.62, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: 2, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08], spin: 40,
                    lifetime: [8, 14], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0x8FBF4A, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "seed_orbit", bind: "source", fit: "body", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: { data: "seeds", fallback: 10 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.05], spin: 60,
                    lifetime: [7, 12], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xE8FF9B, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        toss: {
            emitters: [
                {
                    name: "seed_flight", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    trail: { minDistance: 0.3 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.03], spin: 30,
                    lifetime: [6, 11], size: [0.1, 0.03],
                    color: 0x8FBF4A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "seed_dust", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.2 }, rate: 12,
                    direction: "velocity", speed: [0.0, 0.04], spread: 24, gravity: 0.02,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8FF9B, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        plant: {
            duration: 40,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "roots_break", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "roots", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.08, 0.26], spread: 14, gravity: 0.05, drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x8FBF4A, alpha: [0.95, 0], light: "full", maxParticles: 140
                },
                {
                    name: "soil_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xE8FF9B, alpha: [0.55, 0], light: "full", maxParticles: 20
                },
                {
                    // 命中时只炸开一撮嫩叶，真正的持续标识交给 sprout：不做长问号噪声。
                    name: "leaf_burst", bind: "target", fit: "body", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "roots", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], spread: 20, spin: 30,
                    lifetime: [10, 18], size: [{ data: "worrySize", fallback: 0.18 }, 0.03], sizeMode: "index",
                    color: 0x8FBF4A, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        sprout: {
            // 无 duration（0 = 由服务端释放 key 时停止）：顶芽随真实标记维持，清除/期满同步收掉。
            emitters: [
                {
                    name: "sprout_leaf", bind: "target", fit: "body", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 3, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "down", speed: [0.0, 0.04], spin: 24,
                    lifetime: [12, 22], size: [{ data: "sprout", fallback: 0.18 }, 0.03], sizeMode: "sin",
                    color: 0x8FBF4A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "sprout_glint", bind: "target", fit: "body", offset: [0, 0.95, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "leaves", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xE8FF9B, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        shed: {
            duration: 22, exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "falling_leaves", bind: "target", fit: "body", offset: [0, 0.8, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.05, 0.18], spread: 24, gravity: 0.05, drag: 0.9, spin: 30,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x8FBF4A, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wake: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "wake_ring", bind: "target", fit: "body", offset: [0, 0.78, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 16], size: [0.28, 0.72], sizeMode: "sin",
                    color: 0xE8FF9B, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "wake_glints", bind: "target", fit: "body", offset: [0, 0.82, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "glints", fallback: 12 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.24], spread: 16, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xE8FF9B, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "wake_eyes", bind: "target", fit: "body", offset: [0, 0.86, 0],
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 2, at: 1 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.03, 0.12],
                    lifetime: [8, 12], size: [0.3, 0.06],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "miss_burst", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "seeds", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FBF4A, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_worryseed", 1, WorryseedSceneDefinition);
