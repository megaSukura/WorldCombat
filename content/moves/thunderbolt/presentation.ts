/**
 * 十万伏特 / thunderbolt 的客户端表现。
 *
 * 一句话：施法者指尖攒起一团电，随后一束主电沿瞄准线由细预告线长出折电、一直长到碰撞点；主束在终点炸开，
 *   扩散式再从主命中者向邻敌逐条拉出短电弧。撞墙或空放只在该点散一下电。
 * 色相家族：电黄（0xFFE14D）与冷白（0xEAFBFF / 0xF2FBFF）为主，浅青绿（0xC8F0A0）只做地面环的细节。没有第二个色相。
 * 拍子：起（charge 攒电）→ 束（beam 主束逐段长出）→ 击（impact 终点主爆）→ 散（branch 逐条分叉）→ 收（fizzle 散电）。
 * 范围：主束沿 `data.path` 的两端顶点生长，画出来的线就是判定走的那条；`scale` 跟随爆开半径，撞墙处只在该点炸。
 * 运动：主束是沿固定线的推进，不是飞行物；分叉沿各自的 `data.path` 两端拉一条短电弧，不在整个圆圈同时炸闪。
 * 数：`data.arcs`（由特攻派生）绑定主爆与分叉的电弧条数，`data.scale`（爆开半径派生）缩放尺寸，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ThunderboltDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 16, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFE14D, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.45, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [4, 9], size: [0.1, 0.02],
                    color: 0xFFF6C0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        beam: {
            duration: 12,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "guide", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 90, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [3, 6], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "creep", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 50, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.12], spread: 20,
                    lifetime: [4, 9], size: [0.1, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 110
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "line", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 8 }, at: 1 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.06, 0.24], spread: 26,
                    lifetime: [5, 12], size: [0.16, 0.04],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.28], spread: 16,
                    lifetime: [5, 11], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 60
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        branch: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "arc", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 4 }, at: 1 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.2], spread: 24,
                    lifetime: [4, 9], size: [0.12, 0.03],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "spark", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 60, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.14],
                    lifetime: [3, 8], size: [0.08, 0.01],
                    color: 0xFFE14D, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "tip", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "arcs", fallback: 4 } },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC8F0A0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "groundout", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xF2FBFF, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.16, 0.26],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thunderbolt", 1, ThunderboltDefinition);
