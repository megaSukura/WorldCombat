/**
 * 森林诅咒 / forestscurse 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里画出一道绿纹，目标脚下的地面钻出一圈扭动的根须把它缠住，头顶罩下一阵落叶，
 *   命中处的地面顶出一小块苔；诅咒过去时叶子从它身上落下来。
 *
 * 色相家族：森林绿（0x5FA83C 主体／0x3E7A2A 深根）与嫩叶黄绿（0xA8D84C 叶片高光）撑起全部层次，
 *   土褐（0x6B5236）只用在根须带起的碎土上。
 * 层次：起（手边绿纹）→ 生（根须破土、碎土）→ 罩（落叶旋转下坠）→ 解／败。
 * 起击收：sign（起）→ root（生）→ canopy（罩）→ lift（解）。
 * 范围：root 的破土圈半径直接绑 `data.grove`（实际苔圈半径），画出的那圈就是判定与苔藓的尺度。
 * 运动：根须自地面向上钻出并向外散开，碎土受重力回落，落叶从头顶旋转下坠，散去时叶片贴地飘散。
 * 数：根须条数读 `data.roots`（特攻派生）、叶片数读 `data.leaves`（速度派生），整体尺寸随 `data.scale`、
 *   浓度随 `data.intensity`（诅咒时长派生）。
 */
const ForestscurseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sign: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "sigil", bind: "source", offset: [0, 0.3, 0.3], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.02, 0.08], spin: 20,
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0x5FA83C, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.35, 0.3], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xA8D84C, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        root: {
            duration: 36,
            exit: { stop: 18, drain: 18 },
            emitters: [
                {
                    name: "sprout", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "roots", fallback: 12 } },
                    shape: { kind: "sphere", radius: { data: "grove", fallback: 1.6 } },
                    direction: "up", speed: [0.04, 0.16], gravity: -0.004, spread: 24,
                    lifetime: [12, 22], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x5FA83C, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: { data: "grove", fallback: 1.6 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xA8D84C, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "soil", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "roots", fallback: 12 }, interval: 2 },
                    shape: { kind: "sphere", radius: { data: "grove", fallback: 1.6 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, drag: 0.92,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x6B5236, alpha: [0.55, 0], light: "world", maxParticles: 80
                },
                {
                    name: "grove", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "grove", fallback: 1.6 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.26, 0.66], sizeMode: "index",
                    color: 0x3E7A2A, alpha: [0.6, 0], light: "world", maxParticles: 8
                }
            ]
        },
        canopy: {
            duration: 36,
            exit: { stop: 18, drain: 20 },
            emitters: [
                {
                    name: "fall", bind: "point", offset: [0, 2.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "leaves", fallback: 14 },
                    shape: { kind: "circle", radius: { data: "grove", fallback: 1.6 }, rotation: [90, 0, 0] },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.012, spin: 14, spread: 30,
                    lifetime: [16, 26], size: [0.16, 0.04],
                    color: 0xA8D84C, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "swirl", bind: "point", offset: [0, 1.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 10, shape: { kind: "ring", radius: { data: "grove", fallback: 1.6 } },
                    direction: "outward", speed: [0.03, 0.1], spin: 22,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x5FA83C, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        lift: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "shed", bind: "point", offset: [0, 1.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "away", speed: [0.02, 0.08], gravity: 0.014, spin: 12,
                    lifetime: [14, 24], size: [0.14, 0.03],
                    color: 0x7FA84C, alpha: [0.7, 0], light: "world", maxParticles: 36
                },
                {
                    name: "glow", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xA8D84C, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "dust", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9, gravity: 0.012,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8A7A5A, alpha: [0.45, 0], light: "world", maxParticles: 26
                },
                {
                    name: "leaf", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], gravity: 0.014,
                    lifetime: [12, 20], size: [0.12, 0.03], spin: 8,
                    color: 0x5FA83C, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_forestscurse", 1, ForestscurseDefinition);
