/**
 * 打草结 / grassknot 的客户端表现。
 *
 * 一句话：施法者脚边草种被按进土里、沿地面朝对手钻去 → 对手脚下翻开一圈苔草，绿环在地面上一张一缩地等 →
 * 缠结猛地收拢，藤须与草屑向中心一收再炸开 → 被缠住的人腿脚上绕起一圈藤结。
 * 色相家族：草绿与苔绿（seed / sprout / leaf / impact_grass / wrap）为主体，土褐（tinydust）作尘，近白只做收拢高光。
 * 拍子：起（windup 播种）→ 芽（sprout 等待窗口）→ 击（snap 收拢）→ 收（trip 缠足、empty 落空）。
 * 范围：sprout／snap／empty 绑落点、fit none，环半径按 `data.scale`（实际缠结范围 / 2.4）铺开，画出来就是判定覆盖的地块。
 * 运动：藤须从四周向中心收（inward），草屑被收拢一瞬向外炸开，草种贴地打转。
 * 数：snap 的草屑量绑 `data.caught`（缠住的敌人数），trip 的藤结圈数绑 `data.coils`（掉速等级派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GrassKnotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "seed_run", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0x7CB342, alpha: [0.7, 0], light: "world", maxParticles: 46
                },
                {
                    name: "soil_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [0.28, 0.5], sizeMode: "sin",
                    color: 0x5A7A34, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        sprout: {
            duration: { data: "delay", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "patch_edge", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 8, shape: { kind: "ring", radius: 2.4 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [12, 20], size: [0.42, 0.7], sizeMode: "sin",
                    color: 0x6FA34A, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "sprout_burst", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "ring", radius: 2.2 },
                    direction: "up", speed: [0.06, 0.2],
                    gravity: 0.03, drag: 0.95,
                    lifetime: [12, 22], size: [0.16, 0.02], sizeMode: "index",
                    color: 0x8CC63F, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "patch_seeds", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 24, shape: { kind: "circle", radius: 2.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.04, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x5A7A34, alpha: [0.4, 0], light: "world", maxParticles: 80
                }
            ]
        },
        snap: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "tie_close", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "ring", radius: 2.3 },
                    direction: "inward", speed: [0.22, 0.5],
                    lifetime: [5, 10], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xDFF0B0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "vine_burst", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "caught", fallback: 1 }, at: 1, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "outward", speed: [0.06, 0.24], spread: 40,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x4E7A2E, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "clippings", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: 30, at: 1 },
                    shape: { kind: "sphere_surface", radius: 1.1 },
                    direction: "outward", speed: [0.1, 0.34], spread: 36,
                    gravity: 0.07, drag: 0.93,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x8CC63F, alpha: [0.85, 0], light: "world", maxParticles: 110
                },
                {
                    name: "impact_flash", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    lifetime: [5, 9], size: [0.4, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        trip: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "leg_knot", bind: "target", offset: [0, 0.12, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "coils", fallback: 12 }, at: 1, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.24, 0.04],
                    color: 0x4E7A2E, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "leg_leaves", bind: "target", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0x7CB342, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        empty: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "circle", radius: 1.6 },
                    direction: "outward", speed: [0.02, 0.06],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x5A7A34, alpha: [0.4, 0], light: "world", maxParticles: 50
                },
                {
                    name: "dim_ring", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "ring", radius: 1.8 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.4, 0.1],
                    color: 0x6FA34A, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grassknot", 1, GrassKnotDefinition);
