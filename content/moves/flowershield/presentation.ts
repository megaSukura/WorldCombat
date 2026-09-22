/**
 * 鲜花防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者张臂，一圈花瓣从身侧层层翻开、向外推成一道花浪；被扫到的草属性身上浮起一圈护瓣，
 *   防御抬起来；花瓣停一阵便凋落。
 *
 * 色相家族：粉（0xE89AC0）画花浪与护瓣，近白粉（0xF6E3EE）做高光，暖黄（0xF2D27A）只作为花心那一撮小面积强调。
 * 层次：起（身侧拢瓣）／绽（外推花浪＋护瓣）／持（护瓣在目标身上）／收（凋落）。
 * 起击收：gather（起）→ bloom（击）→ guard（落在谁身上）→ fade（收）。
 * 范围：bloom 的花浪层绑 `data.scale`（实际花浪半径 / 3.0）铺出与判定同径的花环，玩家一眼知道站多远会被扫到。
 * 运动：花瓣沿径向由内向外翻卷、带缓降；护瓣贴着目标向外展开一圈；凋落时向下飘。
 * 数：花瓣量绑 `data.petals`（特攻与等级派生），护瓣强度绑 `data.guard`（防御等级派生），
 *   范围与尺寸绑 `data.scale`（体型与特攻派生）——都由本招算出的机制值驱动。
 */
const FlowerShieldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_petals", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "petals", fallback: 24 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.2 }, direction: "inward", speed: [0.02, 0.08], spin: 20,
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0xE89AC0, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        bloom: {
            duration: 40,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "bloom_ring", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "petals", fallback: 24 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: 3.0, thickness: 0.9 }, direction: "outward", speed: [0.12, 0.3],
                    gravity: 0.012, drag: 0.95, spin: 26,
                    lifetime: [16, 28], size: [0.24, 0.08],
                    color: 0xE89AC0, alpha: [0.9, 0], light: "full", maxParticles: 200
                },
                {
                    name: "bloom_haze", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 3.0 }, direction: "outward", speed: [0.06, 0.16],
                    lifetime: [14, 24], size: [0.14, 0.03],
                    color: 0xF6E3EE, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 120
                },
                {
                    name: "bloom_core", bind: "source", fit: "body", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "reached", fallback: 1 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.6 }, direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.3, 0.12], sizeMode: "index",
                    color: 0xF2D27A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        guard: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "guard_petals", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.55 }, direction: "outward", speed: [0.04, 0.12], spin: 22,
                    lifetime: [14, 24], size: [0.16, 0.05],
                    color: 0xE89AC0, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "guard_glow", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xF6E3EE, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "fade_petals", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 }, direction: "down", speed: [0.01, 0.05], spin: 18,
                    lifetime: [16, 26], size: [0.14, 0.04],
                    color: 0xE89AC0, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flowershield", 1, FlowerShieldDefinition);
