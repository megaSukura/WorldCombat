/**
 * 木枝突刺 / branchpoke 的客户端表现。
 *
 * 一句话：身侧的枝叶收拢、枝尖聚起一点绿光，随后一根细枝绷直朝目标戳出去，末梢戳到尽头时弯出一记回弹、
 * 冒出一小簇嫩芽；命中处炸开草系冲击与散叶，刺枝式还会留下一点挂枝的绿环。
 * 色相家族：叶绿（0x8CC24E）作主体、亮黄绿（0xB6E06A）作细节、近白（0xEAF8C8）作强调；中性尘屑收尾。
 * 拍子：起 coil（收枝聚光）→ 戳 thrust（细枝戳出）与 tip（末梢回弹）→ 击 hit（散叶）／挂枝 snare ／空 miss。
 * 范围：thrust 的细线用 `data.path`（与服务端 lane 同一条细线）画成一条亮线，玩家一眼看出只有这条线会被戳到。
 * 运动：细枝沿 `data.direction` 一次绷直戳出，tip 的嫩芽在枝梢向上冒出；命中散叶沿目标向外崩开。
 * 数：枝线与命中散叶的量绑 `data.leaves`（物攻换算），末梢嫩芽与命中的尺寸读 `data.scale`
 *     （服务端传的「越远越疼」倍率，1 + 弹劲 × 距离比例）——戳得越远、画面里的枝梢越饱满。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BranchpokeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 12,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x8CC24E, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        thrust: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "twig_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "polyline" }, burst: { count: { data: "leaves", fallback: 14 } },
                    direction: "shape", orient: "direction", speed: [0.04, 0.14], spin: 10,
                    lifetime: [5, 10], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "twig_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    shape: { kind: "polyline" }, burst: { count: 6 },
                    direction: "shape", orient: "direction", speed: [0.05, 0.16],
                    lifetime: [4, 8], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xEAF8C8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        tip: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "sprout", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 8, at: 0 }, shape: { kind: "ring", radius: 0.2 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xB6E06A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 26
                },
                {
                    name: "seed", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "leaves", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 9, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.07, 0.22], spread: 22,
                    lifetime: [4, 8], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF8C8, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "scatter", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "leaves", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 40, spin: 14,
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.75, 0], light: "full", maxParticles: 50
                }
            ]
        },
        snare: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "bind", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [12, 18], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 8
                },
                {
                    name: "snag", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 8, at: 0 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xB6E06A, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [7, 13], size: [0.09, 0.02],
                    color: 0x8CC24E, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_branchpoke", 1, BranchpokeDefinition);
