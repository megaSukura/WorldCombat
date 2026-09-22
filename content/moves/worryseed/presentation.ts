/**
 * 烦恼种子 / worryseed 的客户端表现。
 *
 * 一句话：手心里鼓起一颗种子、身边绕着几颗同样的种子 → 种子脱手拖着细尾迹飞向对手 → 命中处根须破土、
 *         冒出一撮「？」，对手身上挂着一层还没散去的绿雾。
 * 色相家族：种壳绿 0x8FBF4A 作主体，嫩芽黄绿 0xE8FF9B 作高光，闷紫 0x6B5BA8 只出现在「？」与心绪层。
 * 拍子：起 gather 0–12t ／ 飞 toss 40t（沿 projectile 绑定）／ 击 plant 40t ／ 空 miss 24t。
 * 范围：plant 的空土环按 `data.scale`（种子半径比）铺开，画出这颗种子砸到多大一块；
 *   根须沿 `data.roots` 条数从地面向上炸开，就是它真正顶出的那块地。
 * 运动：种子绕手慢转、脱手后沿轨迹飞、命中时根须向上顶、「？」向上飘散。
 * 数：种子数绑 `data.seeds`（特攻派生），心绪数绑 `data.worries`（等级派生），根须数绑 `data.roots`
 *   （特攻与体重派生）；深植（`data.deep`）让心绪层更大更久。
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
                    name: "worry_marks", bind: "target", fit: "body", offset: [0, 0.75, 0],
                    particle: "world_combat_core:cobblemon/generic/question",
                    burst: { count: { data: "worries", fallback: 6 } },
                    shape: { kind: "box", size: [0.7, 0.9, 0.7] },
                    direction: "up", speed: [0.03, 0.12], spread: 12, spin: 20,
                    lifetime: [16, 28], size: [0.2, 0.08], sizeMode: "index",
                    color: 0x6B5BA8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "worry_cling", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10,
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "down", speed: [0.0, 0.05], spin: 30,
                    lifetime: [12, 22], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8FBF4A, alpha: [0.65, 0], light: "world", maxParticles: 60
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
