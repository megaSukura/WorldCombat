/**
 * 冰锥 / iciclespear 的客户端表现。
 *
 * 一句话：施法者身前按各真实锥位凝出一排冰晶，一次齐射全部笔直平行射出；打中的在目标身上「啪」地碎开、冰屑四散，
 *   并挂上随载体存在的霜纹；撞在硬面上的当场碎冰，空飞的在真实末点淡出。
 * 色相家族：冰青（0x9FD8E8／0xBFE8F5 偏色）＋近白冰晶高光＋一点 impact 亮边；整体低饱和。
 * 拍子：起 gather（按各真实锥位凝出整排冰锥）→ 射 volley（真实平行路径）→ 碎 shatter（命中碎冰）／
 *   附着 chillmark（刚落上霜寒的短闪）→ 持 chill（随载体存在的霜纹）→ 破 break（撞块碎冰）／
 *   阻 blocked（友体或拒伤）→ 淡 fade（真实末点）。
 * 范围：本招是同向齐排，画面上用一排平行的真实冰锥标出「整排宽度覆盖到哪」，没有地面轮廓。
 * 运动：每根冰锥是服务端同时发射的真投递（`bind:"projectile"`），沿同一条准线平行飞出；
 *   `gather` 的凝结点由自定义场景 `world_combat:move_iciclespear/rank` 逐帧画在 `data.path` 的每个真实锥位上，
 *   不再用 polyline 沿整条边随机撒点。
 * 数：`data.shots` 让起手读出一排几根，`data.shards`（特攻换算的碎冰量）绑定命中冰屑量，`data.frost`
 *   与 `data.scale`（冰屑范围 / 1.0）绑定附着大小，`data.intensity`（单锥威力 / 25）放大整幕，
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
        chillmark: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "seal", bind: "target", offset: [0, 0.4, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], spin: 6,
                    lifetime: [6, 12], size: [0.13, 0.04],
                    color: 0xBFE8F5, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 14
                }
            ]
        },
        chill: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "frostvein", bind: "target", offset: [0, 0.5, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 6, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.0, 0.03], spin: 3,
                    lifetime: [10, 18], size: [0.09, 0.03],
                    color: 0x9FD8E8, alpha: [0.5, 0], light: "world", maxParticles: 30
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
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.06, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [9, 16], size: [0.28, 0.06],
                    color: 0xBFE8F5, alpha: [0.6, 0], light: "world", maxParticles: 16
                }
            ]
        },
        blocked: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "dull", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.06, drag: 0.9,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x9FD8E8, alpha: [0.5, 0], light: "world", maxParticles: 16
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

/**
 * 凝结点场景：按 `data.path` 里每个真实锥位画一颗固定数量的冰晶贴图，并用一条细线把整排连起来读宽度；
 * 不用粒子生灭，直接复用原生图集。`data.rime` 决定亮度。随动作结束一起消失。
 */
WorldCombatClient.scene("world_combat:move_iciclespear/rank", 1, function (frame) {
    const entry: CombatSceneEntry<{ path?: (string | [number, number, number])[]; rime?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const path = entry.data.path;
    if (!Array.isArray(path)) return;
    const now = frame.serverTick(), bright = entry.data.rime ? 0xF4FFFFFF : 0xE0BFE8F5;
    const color = bright | 0;
    let previous: number[] | null = null;
    for (let i = 0; i < path.length; i++) {
        const point = path[i];
        if (!Array.isArray(point) || point.length !== 3) { previous = null; continue; }
        const bob = 0.03 * Math.sin(now * 0.2 + i * 1.3);
        const roll = (now * 6 + i * 40) % 360;
        frame.sprite("cobblemon:particle/generic/ice/iceshard", point[0], point[1] + 0.5 + bob, point[2], 0.34, roll, color, 0, true);
        if (previous !== null)
            frame.line(previous[0], previous[1] + 0.5, previous[2], point[0], point[1] + 0.5, point[2], 0x779FD8E8 | 0);
        previous = point;
    }
});
