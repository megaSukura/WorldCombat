/**
 * 冰锥 / iciclespear 的客户端表现。
 *
 * 一句话：施法者呼出一口寒气、身侧凝出一排冰晶，一根接一根笔直射出去；打中的在目标身上「啪」地碎开、
 *   冰屑四散，落点脚下的地面结出一小片霜，最后霜圈缓缓扩开再散去。
 * 色相家族：冰青（0x9FD8E8／0xBFE8F5 偏色）＋近白冰晶高光＋一点 impact 亮边；整体低饱和。
 * 拍子：起 gather（凝冰）→ 射 volley（一根接一根）→ 碎 shatter（冰屑崩开）→ 霜 frost（地面结霜）。
 * 范围：本招是单体直飞连发，画面靠每根冰锥的直线标出「这一条线上会被打到」；命中后在落点画出 `frost`
 *   半径的霜圈，让玩家读出结霜范围（data.scale = 霜圈半径 / 1.0）。
 * 运动：每根冰锥沿准线高速直飞（几乎不散，画出的冰晶本体由原生实体渲染），命中向外崩冰屑，霜圈贴地扩开。
 * 数：`data.shots` 让起手读出一梭几根，`data.shards`（特攻换算的碎冰量）绑定命中冰屑量，`data.scale`
 *   （霜圈半径 / 1.0）绑定霜圈大小，`data.intensity`（单锥威力 / 25）放大整幕，`data.rime` 让霜附式多一层亮边。
 */
const IciclespearDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "crystal", bind: "source", offset: [0, 0.5, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shots", fallback: 3 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0xBFE8F5, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "cold", bind: "source", offset: [0, 0.4, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.07], gravity: -0.01,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x9FD8E8, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "spear", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    trail: { minDistance: 0.2 }, rate: 30,
                    direction: "outward", speed: [0.0, 0.02], spin: 5,
                    lifetime: [4, 8], size: [0.18, 0.04],
                    color: 0xBFE8F5, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    trail: { minDistance: 0.28 }, rate: 16,
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.03, drag: 0.93,
                    lifetime: [5, 11], size: [0.06, 0.015],
                    color: 0x9FD8E8, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        },
        shatter: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [4, 9], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 14
                },
                {
                    name: "icechips", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.26], spread: 26, spin: 7,
                    gravity: 0.09, drag: 0.9,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0xBFE8F5, alpha: [0.9, 0], light: "full", maxParticles: 44
                },
                {
                    name: "frostpuff", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.04, drag: 0.88,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0x9FD8E8, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        frost: {
            duration: 22,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "spread", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [9, 16], size: [0.3, 0.06],
                    color: 0xBFE8F5, alpha: [0.6, 0], light: "world", maxParticles: 16
                },
                {
                    name: "rime", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 14, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 1.0 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 15], size: [0.06, 0.02],
                    color: 0xCFEFF8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iciclespear", 1, IciclespearDefinition);
