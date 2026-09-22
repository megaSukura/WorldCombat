/**
 * 十万伏特 / thunderbolt 的客户端表现。
 *
 * 一句话：施法者指尖攒起一团电、压成一枚亮芯弹丸，弹丸拖着一条剥落的电尾直飞目标，命中处炸开一片电光与电弧；
 *   扩散式下电花再向四周铺开一层，打空只留一下散电。
 * 色相家族：电黄（0xFFE14D）与冷白（0xEAFBFF / 0xF2FBFF）为主，浅青绿（0xC8F0A0）只做地面环的细节。没有第二个色相。
 * 拍子：起（charge 攒电压弹）→ 飞（travel 拖尾电弹）→ 击（burst 炸开、splash 铺开）→ 收（fizzle 散电 / 各层淡出）。
 * 范围：burst／splash 绑在命中点上，形状半径按参考值 0.9 格书写，服务端把 `data.scale = 实际爆开半径 / 0.9`
 *   传进来，`fit: "none"` 让几何跟着 `scale` 走——画出来的圈就是真正会被电到的地。
 * 运动：电弹沿直线飞行，拖尾跟着弹体；命中点向四周炸开，扩散式再沿地面向外铺一层。
 * 数：`data.sparks`（由威力派生）绑定命中爆发的粒子数，`data.arcs`（由特攻派生）绑定电弧与环的条数，
 *   `data.flow`（由威力派生）绑定拖尾密度，`data.scale` 同时缩放尺寸。
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
        travel: {
            duration: 100,
            exit: { stop: 90, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 40, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [4, 8], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "trail", bind: "projectile", fit: "none", trail: { minDistance: 0.12 },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "flow", fallback: 90 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.12],
                    lifetime: [5, 11], size: [0.1, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "spark", bind: "projectile", fit: "none", trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    rate: 20, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [3, 7], size: [0.12, 0.02],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.9 },
                    direction: "outward", speed: [0.06, 0.3], spread: 16,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "arcs", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "outward", speed: [0.08, 0.34], spread: 12,
                    lifetime: [5, 12], size: [0.16, 0.04],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "arcs", fallback: 6 } },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.24, 0.1],
                    color: 0xC8F0A0, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "cling", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "arcs", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        splash: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "spread", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 1 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.26], spread: 14,
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "ground", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 30, shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.16], spread: 18,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xC8F0A0, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "groundout", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 8 }, at: 1 },
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
