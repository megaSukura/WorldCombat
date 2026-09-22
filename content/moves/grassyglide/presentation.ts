/**
 * 青草滑梯 / grassyglide 的客户端表现。
 *
 * 一句话：脚边青草收拢、身体压低，随后整个人贴着地面滑出去，身后翻起一条长长的草浪；撞上谁就在接触处爆开
 *   一层草叶，并在地上压出一小片会站人的青草（站着淡长、慢慢枯回去）。脚下有草起手时，第一拍会亮起一圈托举绿光。
 * 色相家族：草绿一族（0x7CCB5A 主体、0x9FE06A 亮叶、0x4E7A3A 暗叶、0xE8F4D0 只做草尖高光），尘土用中性灰。
 * 拍子：起 gather／boost（聚草压低）→ 滑 slide（鱼雷式草浪）→ 击 hit（接触爆草）→ 种 plant／patch（长出草皮）→ 收 whiff。
 * 范围：hit 绑命中点画在接触处；plant 与 patch 都绑落地点，`data.radius`／`data.scale` 就是那片草的真实半径。
 * 运动：slide 是沿施法者自身运动（orient: velocity）拖出的草浪，草叶向后翻；托举绿光向内收拢再向上抬。
 * 数：slide 与 hit 的草叶量绑定 `data.tufts`（速度与等级换算），尺度绑定 `data.scale`（判定半径换算），
 *   patch 的草叶密度同样绑定 `data.tufts`；命中强弱由 `data.intensity`（滑撞威力换算）决定亮暗。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GrassyglideDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "gather_leaves", bind: "source", offset: [0, 0.18, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0x9FE06A, alpha: [0.75, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 12, shape: { kind: "ring", radius: 0.52 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.3, 0.62],
                    color: 0x7CCB5A, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        boost: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "boost_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.36, 0.85],
                    color: 0x9FE06A, alpha: [0.6, 0], light: "full", maxParticles: 8
                },
                {
                    name: "boost_lift", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: 26, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x7CCB5A, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        slide: {
            duration: 40,
            exit: { stop: 32, drain: 14 },
            emitters: [
                {
                    name: "wake", bind: "source", offset: [0, 0.12, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 80, trail: { minDistance: 0.22 },
                    shape: { kind: "point" },
                    orient: "velocity", direction: "away", speed: [0.05, 0.22], spread: 20,
                    lifetime: [10, 18], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "world", maxParticles: 180
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 60, trail: { minDistance: 0.18 },
                    shape: { kind: "point" },
                    orient: "velocity", direction: "away", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x9FE06A, alpha: [0.6, 0], light: "full", maxParticles: 140
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "cone", radius: 0.5, angleDegrees: 26 },
                    direction: "shape", orient: "velocity", speed: [0.04, 0.2], spread: 18,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x8A9A6A, alpha: [0.35, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_leaf", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "tufts", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [8, 16], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FE06A, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "hit_impact", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.7, 1.4], sizeMode: "index",
                    color: 0xE8F4D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        plant: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "plant_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0x7CCB5A, alpha: [0.6, 0], light: "world", maxParticles: 8
                },
                {
                    name: "plant_sprout", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "tufts", fallback: 18 }, at: 0 },
                    shape: { kind: "circle", radius: 1.4 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.22, 0.06], sizeMode: "index",
                    color: 0x9FE06A, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        patch: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "patch_sprout", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    rate: { data: "tufts", fallback: 20 },
                    shape: { kind: "circle", radius: 1.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 28], size: [0.16, 0.04],
                    color: 0x7CCB5A, alpha: [0.3, 0], light: "world", maxParticles: 40
                },
                {
                    name: "patch_leaf", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 8, shape: { kind: "circle", radius: 1.4 },
                    direction: "up", speed: [0.01, 0.05],
                    spin: 4,
                    lifetime: [20, 34], size: [0.12, 0.03],
                    color: 0x9FE06A, alpha: [0.22, 0], light: "world", maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff_leaf", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x7CCB5A, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grassyglide", 1, GrassyglideDefinition);
