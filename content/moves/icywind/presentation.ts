/**
 * 冰冻之风 / icywind 的客户端表现。
 *
 * 一句话：嘴边先卷起一圈白气，随后一堵冷气锋向前推出整条走廊，锋线上结着一排冰晶；被扫到的人身上炸开
 *   一撮冰屑，走过的地面只浮起一层很快退去的细霜，不铺可站立的冰面。
 * 色相家族：冰白（0xEAF9FF）为主、浅蓝（0xBFE9FF／0x8FD6F5）作锋线与冰晶，白色小点只做细节。
 * 拍子：起（gather 嘴边聚霜）→ 推（front 锋面推移 + swept 逐个冻上）→ 收（rimes 细霜迅速消退）。
 * 范围：front 用与判定同源的当刻锋线顶点；粒子只沿地面锋线铺雪，真实上下边界的短雪帘由
 *   `world_combat:move_icywind_front` 自定义场景按 `data.edge`／`data.base`／`data.top` 绘制，固定顶点、固定数量。
 * 数：`data.flow`（走廊宽度派生）决定锋面密度，`data.count`（威力派生）决定命中冰屑量，
 *   `data.cells`（霜点数量）决定地面细霜密度，`data.scale`（射程 / 参考射程）控制粒子尺寸，
 *   `data.drop`（实际降速级数）决定命中的冷色强度。
 */
const IcywindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xEAF9FF, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "breath", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [7, 13], size: [0.2, 0.05],
                    color: 0xBFE9FF, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        front: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 70 }, direction: "outward", speed: [0.03, 0.12], spread: 10,
                    lifetime: [6, 13], size: [0.15, 0.03],
                    color: 0xBFE9FF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 180
                },
                {
                    name: "creep", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 60 }, direction: "outward", speed: [0.02, 0.09], spread: 8,
                    gravity: 0.01, drag: 0.92,
                    lifetime: [8, 16], size: [0.18, 0.05],
                    color: 0xEAF9FF, alpha: [0.4, 0], light: "world", maxParticles: 160
                }
            ]
        },
        swept: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "clung", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 14, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0x8FD6F5, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rimes: {
            duration: 22,
            exit: { stop: 4, drain: 16 },
            emitters: [
                {
                    name: "sheet", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "cells", fallback: 24 }, at: 1 },
                    direction: "outward", speed: [0.004, 0.02], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xF2FBFF, alpha: [0.22, 0], light: "world", maxParticles: 120
                },
                {
                    name: "motes", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "cells", fallback: 24 }, interval: 3, repeats: 2 },
                    direction: "up", speed: [0.008, 0.04], spin: 12,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xBFE9FF, alpha: [0.24, 0], light: "full", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icywind", 1, IcywindDefinition);

/** 当刻锋面的真实上下边界短雪帘：沿 `data.edge` 的每个顶点从下缘连到上缘，再连相邻顶点，固定顶点的线框。 */
const IcywindFlake = "cobblemon:particle/generic/ice/icy_snow";
function icywindNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function icywindPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (Array.isArray(entry) && entry.length === 3 && entry.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            points.push([Number(entry[0]), Number(entry[1]), Number(entry[2])]);
    }
    return points;
}

WorldCombatClient.scene("world_combat:move_icywind_front", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const edge = icywindPoints(data.edge);
    if (edge.length < 2) return;
    const base = icywindNumber(data.base, edge[0][1]);
    const top = Math.max(base + 0.2, icywindNumber(data.top, base + 1.4));
    const intensity = Math.max(0.5, Math.min(2, icywindNumber(data.intensity, 1)));
    const alpha = Math.round((110 + 60 * Math.min(1.4, intensity)));
    const lineColor = (alpha << 24 | 0xBFE9FF) | 0;
    for (let i = 0; i < edge.length; i++) {
        frame.line(edge[i][0], base, edge[i][2], edge[i][0], top, edge[i][2], lineColor);
    }
    for (let i = 1; i < edge.length; i++) {
        frame.line(edge[i - 1][0], base, edge[i - 1][2], edge[i][0], base, edge[i][2], lineColor);
        frame.line(edge[i - 1][0], top, edge[i - 1][2], edge[i][0], top, edge[i][2], (Math.round(alpha * 0.7) << 24 | 0xEAF9FF) | 0);
    }
    const step = edge.length > 6 ? 2 : 1;
    for (let i = 0; i < edge.length; i += step) {
        frame.sprite(IcywindFlake, edge[i][0], base + (top - base) * 0.5, edge[i][2], 0.22 + 0.06 * intensity, 0,
            ((Math.round(alpha * 0.85) << 24) | 0xEAF9FF) | 0, 0, true);
    }
});
