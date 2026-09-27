/**
 * 热水 / scald 的客户端表现。
 *
 * 一句话：掌中先翻起一撮滚着白汽的水泡，随即一团沸水被兜手抛出、拖着一缕白汽沿浅弧飞出，
 *   落在目标身上炸成一片四散的水花与蒸汽；撞墙则在接触点淌下一记水滴与蒸汽。
 * 色相家族：水的青白（0xCFEFFF）与蒸汽的近白（0xEAF6FF）为主体，滚水核心一点偏暖的白（0xD6F0FF）。
 * 拍子：起 steep（团水）→ 抛 flight（水弹 + 白汽尾）→ 击 burst（水花与蒸汽）→ 撞墙 trickle／到程 fizzle。
 * 运动：水弹沿机制给的速度与下坠走浅弧（projectile 绑定），水花向外散、蒸汽向上飘，墙滴向下淌。
 * 数：burst 的水花与蒸汽数绑定 `data.drops`（特攻与等级换算），强度绑定 `data.intensity`（威力派生），
 *   水团与墙滴大小绑定 `data.scale`。画面只表达命中的水花与蒸汽，没有持续水洼。
 */
const ScaldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        steep: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "bubbles", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    rate: 16, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xBFE8FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 26
                },
                {
                    name: "steam", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [8, 16], size: [0.14, 0.3],
                    color: 0xEAF6FF, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 0,
            emitters: [
                {
                    name: "head", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    trail: { minDistance: 0.2 }, rate: 24,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [5, 9], size: [0.26, 0.1],
                    color: 0xD6F0FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "steam", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    trail: { minDistance: 0.16 }, rate: 20,
                    direction: "velocity", speed: [0.0, 0.05], spread: 20,
                    gravity: 0.01, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "drops", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [6, 13], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xCFEFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "outward", speed: [0.12, 0.4], spread: 26,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 44
                },
                {
                    name: "steam", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [10, 20], size: [0.2, 0.4],
                    color: 0xEAF6FF, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        trickle: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "drop", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.08 },
                    direction: "down", speed: [0.0, 0.06], gravity: 0.05,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xCFEFFF, alpha: [0.85, 0], light: "full", maxParticles: 2
                },
                {
                    name: "steam", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.24],
                    color: 0xEAF6FF, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 16], size: [0.18, 0.32],
                    color: 0xDCE8EE, alpha: [0.3, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scald", 1, ScaldDefinition);
