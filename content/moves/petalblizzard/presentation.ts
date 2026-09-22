/**
 * 落英缤纷 / petalblizzard 的客户端表现。
 *
 * 一句话：施法者身周卷起一团落英，第一阵风把花瓣朝身上收拢，随后几阵把花瓣与叶片一起向外甩开，
 * 被卷过的地方翻起粉白的花瓣，最后瓣片飘落在地面。
 * 色相家族：粉白与嫩绿（cherry_petal / swirlingwind / grass.leaf / impact_grass / glowingsparkle_pink）为主体，
 * 花瓣用贴图原色，只在风层上做轻微偏色。
 * 拍子：起（gather 卷瓣）→ 旋（draw 向内收）→ 甩（lash 向外甩，可重复、`data.pass` 记第几阵、`cut` 逐处割中）→ 收（settle 落瓣 / miss）。
 * 范围：draw / lash / settle 的地面圈按服务端传的 `data.radius`（真实风暴半径）画出，玩家看到的圈就是会被割到的地。
 * 运动：第一阵花瓣与风贴地向内收束，其后几阵反过来向外炸开，落瓣竖直下落——向内还是向外，一眼可读。
 * 数：`data.petals`（物攻与等级派生）决定卷起的花瓣密度，`data.cells`（实际落地瓣片数）决定地面瓣量，
 * `data.flow`（半径派生）决定每一阵的密度，`data.count`（每阵威力派生）决定命中碎叶量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PetalblizzardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "swirl", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.2], spread: 16,
                    lifetime: [12, 22], size: [0.3, 0.1], spriteFrom: "age",
                    color: 0xE8B0C8, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "petals", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.06, 0.24], spread: 20,
                    gravity: 0.01, drag: 0.94,
                    lifetime: [14, 26], size: [0.16, 0.04], spin: 8,
                    alpha: [0.9, 0], light: "world", maxParticles: 80
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 26, shape: { kind: "ring", radius: { data: "area", fallback: 4 } },
                    direction: "up", speed: [0.02, 0.08], spread: 10,
                    lifetime: [12, 22], size: [0.35, 0.5], spriteFrom: "age",
                    color: 0xD8A8C0, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        draw: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "pull", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: { data: "flow", fallback: 80 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.85 },
                    direction: "inward", speed: [0.12, 0.4], spread: 18,
                    gravity: 0.01, drag: 0.95,
                    lifetime: [14, 26], size: [0.16, 0.05], spin: 10,
                    alpha: [0.9, 0], light: "world", maxParticles: 220
                },
                {
                    name: "wind", bind: "point", offset: [0, 0.07, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "inward", speed: [0.08, 0.24], spread: 14,
                    lifetime: [12, 22], size: [0.4, 0.7], spriteFrom: "age",
                    color: 0xE0B8CC, alpha: [0.4, 0], light: "world", maxParticles: 180
                },
                {
                    name: "leaves", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "inward", speed: [0.1, 0.3], spread: 20,
                    lifetime: [10, 18], size: [0.14, 0.04], spriteFrom: "age",
                    alpha: [0.8, 0], light: "world", maxParticles: 160
                }
            ]
        },
        lash: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: { data: "flow", fallback: 100 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.25, 0.7], spread: 20,
                    gravity: 0.02, drag: 0.93,
                    lifetime: [16, 30], size: [0.18, 0.05], spin: 12,
                    alpha: [0.95, 0], light: "world", maxParticles: 260
                },
                {
                    name: "wind", bind: "point", offset: [0, 0.07, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.2, 0.5], spread: 14,
                    lifetime: [14, 24], size: [0.45, 0.85], spriteFrom: "age",
                    color: 0xE8B8CC, alpha: [0.45, 0], light: "world", maxParticles: 200
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "outward", speed: [0.2, 0.6], spread: 24,
                    gravity: 0.04, drag: 0.95,
                    lifetime: [12, 22], size: [0.13, 0.03], spriteFrom: "age",
                    alpha: [0.9, 0], light: "world", maxParticles: 200
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "petals", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "petals", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04], spin: 10,
                    alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "fall", bind: "point", offset: [0, 0.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "down", speed: [0.04, 0.16], spread: 16,
                    gravity: 0.02, drag: 0.96,
                    lifetime: [26, 46], size: [0.14, 0.03], spin: 8,
                    alpha: [0.7, 0], light: "world", maxParticles: 200
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 4 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [18, 32], size: [0.05, 0.01],
                    alpha: [0.3, 0], light: "full", maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "drift", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.18], spread: 14,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [16, 28], size: [0.14, 0.03], spin: 8,
                    alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_petalblizzard", 1, PetalblizzardDefinition);
