/**
 * 喷烟 / lavaplume 的客户端表现。
 *
 * 一句话：施法者脚边腾起火星与浓烟，一柱高热烟流自身体向上喷起、逐层升高直到设定高度；被烧到的人身上各自烧起来。
 * 浓烟式时余热仍留在同一根柱子里暗红闷烧，而不是铺在地上。
 * 色相家族：火焰橙与余烬黄（fire/flame / fire/ember / impact_fire）为主体，黑烟（smoke）做衬托，近白只做柱根的高光。
 * 拍子：起（stoke 攒火）→ 击（plume 逐层升起、hit 烧身、cap 顶棚横散）→ 收（ember 柱内余热 / miss 散去）。
 * 范围：plume/ember 的柱体按服务端传的 `data.height`、`data.radius` 与 `data.scale` 画出真实体积；cap 只作顶棚处的装饰横散。
 * 运动：烟柱竖直向上逐层长高，余热仍在同一柱内反复泛红。
 * 数：`data.height`（体型与特攻派生）决定烟柱高度，`data.flow`（高度派生）决定柱内密度，`data.count`（威力派生）决定命中火量。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const LavaplumeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stoke: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "sparks", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.1], spread: 14,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "fumes", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.32],
                    color: 0x4A3A34, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        plume: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "column", bind: "source", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flow", fallback: 70 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 3.2 }, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.06, 0.24], spread: 10,
                    lifetime: [8, 16], size: [0.26, 0.05],
                    color: 0xFF8A33, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: { data: "flow", fallback: 40 },
                    shape: { kind: "cylinder", radius: { data: "core", fallback: 2.2 }, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.05, 0.2], spread: 10,
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFE2A0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 100
                },
                {
                    name: "smoke", bind: "source", offset: [0, 0.2, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 26,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 3.2 }, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.06, 0.2],
                    drag: 0.9,
                    lifetime: [14, 26], size: [0.34, 0.6],
                    color: 0x3A2E2A, alpha: [0.45, 0], light: "world", maxParticles: 100
                }
            ]
        },
        cap: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spread", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "flow", fallback: 20 }, at: 1 },
                    shape: { kind: "circle", radius: 3.2 },
                    direction: "outward", speed: [0.05, 0.2], spread: 18,
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.34, 0.5],
                    color: 0x3A2E2A, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.22, 0.05],
                    color: 0xFF7A2E, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        ember: {
            duration: 24,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "column_heat", bind: "source", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 24,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 3.2 }, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.02, 0.09], spread: 14,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFF6A24, alpha: [0.7, 0], light: "full", maxParticles: 110
                },
                {
                    name: "column_smoke", bind: "source", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 3.2 }, length: { data: "height", fallback: 1.6 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 28], size: [0.32, 0.5],
                    color: 0x3A2E2A, alpha: [0.25, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "collapse", bind: "source", offset: [0, 0.08, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 2.2 }, length: { data: "height", fallback: 1.2 } },
                    direction: "up", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0x4A3A34, alpha: [0.3, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lavaplume", 1, LavaplumeDefinition);
