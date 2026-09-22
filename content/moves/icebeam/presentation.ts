/**
 * 冰冻光束 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边聚起冷雾，随后一条笔直的冰蓝光束瞬间烧过整条瞄准线，一路迸着霜屑；被烧到的人身上
 *   炸开一圈冰棱与霜雾，光束尽头的地表沿着同一条线结出一道会滑的冰。
 * 色相家族：冰蓝 0x9FD8F0／0x6FB7E0 与近白 0xEAF6FF 为主；一个冷色相，没有第二个色相。
 * 层次：聚雾（windup）→ 光束本体（beam）→ 命中冰棱（impact）→ 地面冰线（rime）。
 * 范围：beam 与 rime 都用 `data.path` 画服务端结算用的同一组顶点（起点→尽头），线的走向就是会被打到的方向；
 *   线的粗细由 `data.width` 决定，画多宽就判多宽。
 * 运动：光束粒子沿 path 密铺、几乎不散（一条稳定的线）；命中处冰棱向外炸、霜雾下沉；冰线上霜粒缓缓上浮。
 * 数：`data.rate`／`data.shardRate` 由本招威力派生决定光束的粒子密度与霜屑量；`data.impactCount`（威力派生）
 *   决定命中冰棱数；`data.rimeRate`（冰线块数派生）决定冰线上的霜粒密度；`data.pierce` 决定光束分股的层数。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const IcebeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "cold_gather", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 26, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0xEAF6FF, alpha: [0.55, 0], light: "full", maxParticles: 44
                },
                {
                    name: "focus_spark", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9FD8F0, alpha: [0.85, 0], light: "full", maxParticles: 28
                }
            ]
        },
        beam: {
            duration: { data: "beamTicks", fallback: 16 },
            exit: { stop: 200, drain: 12 },
            emitters: [
                {
                    name: "beam_core", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    shape: { kind: "polyline" }, positionJitter: [{ data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }],
                    rate: { data: "rate", fallback: 150 }, direction: "shape", speed: [0.0, 0.03], drag: 0.86,
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 260
                },
                {
                    name: "beam_shard", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    shape: { kind: "polyline" }, positionJitter: [{ data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }],
                    rate: { data: "shardRate", fallback: 40 }, direction: "shape", speed: [0.02, 0.14], spin: 24,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0x9FD8F0, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "beam_mist", bind: "path", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polyline" }, positionJitter: [{ data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }, { data: "width", fallback: 0.7 }],
                    rate: { data: "shardRate", fallback: 40 }, direction: "shape", speed: [0.0, 0.05], gravity: -0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xBFE8FF, alpha: [0.4, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ice_burst", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "impactCount", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "shard_spray", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "impactCount", fallback: 30 } }, amount: 2,
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.025, spin: 22,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "frost_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.26, 0.02],
                    color: 0x6FB7E0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        rime: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "rime_patch", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    shape: { kind: "polyline" }, positionJitter: [0.5, 0.25, 0.5],
                    rate: { data: "rimeRate", fallback: 60 }, direction: "up", speed: [0.0, 0.05], gravity: 0.005, drag: 0.94,
                    lifetime: [14, 24], size: [0.14, 0.02],
                    color: 0xCFEAF8, alpha: [0.45, 0], light: "world", maxParticles: 140
                },
                {
                    name: "rime_glint", bind: "path", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    rate: { data: "rimeRate", fallback: 60 }, direction: "shape", speed: [0.0, 0.03],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9FD8F0, alpha: [0.5, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icebeam", 1, IcebeamDefinition);
