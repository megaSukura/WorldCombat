/**
 * 冰锥 / iciclespear 的客户端表现。
 *
 * 一句话：施法者身前横排凝出一排冰晶，一次齐射全部笔直平行射出；打中的在目标身上「啪」地碎开、冰屑四散，
 *   撞在硬面上的当场碎冰，落点只留一圈会消散的冰屑，不再冻地。
 * 色相家族：冰青（0x9FD8E8／0xBFE8F5 偏色）＋近白冰晶高光＋一点 impact 亮边；整体低饱和。
 * 拍子：起 gather（凝出整排冰锥、画出冰排宽度）→ 射 volley（真实平行路径）→ 碎 shatter（命中碎冰）／
 *   破 break（撞块碎冰）／ 冰屑 frost → 淡 fade。
 * 范围：本招是同向齐排，画面上用一排平行的真实冰锥标出「整排宽度覆盖到哪」，没有地面轮廓。
 * 运动：每根冰锥是服务端同时发射的真投递（`bind:"projectile"`），沿同一条准线平行飞出；
 *   `gather` 另用 `bind:"path"` + `shape:"polyline"` 沿 `data.path`（左右端点）在整条边上采样，画出冰排宽度。
 * 数：`data.shots` 让起手读出一排几根，`data.shards`（特攻换算的碎冰量）绑定命中冰屑量，`data.frost`
 *   与 `data.scale`（冰屑范围 / 1.0）绑定霜圈大小，`data.intensity`（单锥威力 / 25）放大整幕，
 *   `data.rime` 让霜附式多一层亮边，`data.path` / `data.direction` 与判定读同一组冰排几何。
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
                    name: "rank", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 26, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [5, 11], size: [0.07, 0.02],
                    color: 0x9FD8E8, alpha: [0.55, 0], light: "world", maxParticles: 44
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
                    direction: "velocity", speed: [0.0, 0.02], spin: 5,
                    lifetime: [4, 8], size: [0.18, 0.04],
                    color: 0xBFE8F5, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    trail: { minDistance: 0.28 }, rate: 16,
                    direction: "velocity", speed: [0.01, 0.05],
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
        },
        break: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shatter", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26, gravity: 0.1, drag: 0.9,
                    lifetime: [8, 15], size: [0.14, 0.04],
                    color: 0xBFE8F5, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "powder", bind: "point", fit: "none", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9FD8E8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        fade: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "thin", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x9FD8E8, alpha: [0.35, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iciclespear", 1, IciclespearDefinition);
