/**
 * 龙锤 / dragonhammer 的客户端表现。
 *
 * 一句话：施法者弓身扬起、龙气沿身体向上收拢，随后从身体前上端落下一道宽大的龙纹锤影，沿真实垂直弧砸到接触点，
 *   命中一声闷响、目标被撞开，只留一小片短尘；没砸中就只有一点落空尘。
 * 色相家族：龙紫（0x7078C8 / 0x9A7BE0 / 0xC9B4F2）为主体，近白只做砸中一刻的核心。
 * 拍子：起（rear 弓身聚龙气）→ 砸（swing 锤影沿真实弧逐刻扫过、与判定同一条路径）→ 落（impact 接触点闷响／whiff 落空短尘）。
 * 范围：swing 的锤影绑 `data.path`（本刻真正扫过的那一段弧），命中绑真实接触点，不做全身乱球或圆爆。
 * 运动：龙气起手时向上收拢；swing 的锤影沿弧逐刻向下；碎屑带重力短促散落。
 * 数：`data.dust`（体重与物攻派生）决定接触碎屑量，`data.scale`（体型派生）控制尺寸，
 *   `data.intensity`（本击威力派生）抬高命中亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rear: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.16], spread: 14,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0x9A7BE0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "trail", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 10, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xC9B4F2, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        swing: {
            exit: { drain: 8 },
            emitters: [
                {
                    name: "shadow", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "outward", speed: [0.02, 0.1], spread: 10,
                    lifetime: [5, 10], size: [0.52, 0.1], sizeMode: "index",
                    color: 0x9A7BE0, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    shape: { kind: "polyline" },
                    rate: 34, direction: "outward", speed: [0.01, 0.06],
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xC9B4F2, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "grit", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 22, direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0x8A7A98, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crush", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [6, 12], size: [0.46, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "debris", bind: "point", offset: [0, -0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.13, 0.03],
                    color: 0x8A7A98, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "stagger", bind: "point", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "stagger", fallback: 0 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    lifetime: [10, 16], size: [0.12, 0.03],
                    color: 0xC9B4F2, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.18], spread: 14,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.3, 0.08],
                    color: 0x8A7A98, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: 0.5, thickness: 0.7 },
                    direction: "outward", speed: [0.04, 0.18], spread: 16,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xA89AB8, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonhammer", 1, DragonhammerDefinition);
