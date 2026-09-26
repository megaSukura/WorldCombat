/**
 * 冰冻光束 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边聚起冷雾，随后一条笔直的冰蓝冷光沿瞄准方向亮起、在实际墙面处截断并停留片刻；一路迸着
 *   霜屑，被光路烧到的人身上炸开一圈冰棱与霜雾，撞到墙时在墙面溅起霜花，光束结束的一刻整条同时熄灭。
 * 色相家族：冰蓝 0x9FD8F0／0x6FB7E0 与近白 0xEAF6FF 为主；一个冷色相，没有第二个色相。
 * 层次：聚雾（windup）→ 光束本体（beam）→ 命中冰棱（impact）→ 墙面霜花（wall）。
 * 范围：beam 用 `data.path` 画服务端射线得到的同一组顶点（起点→截断点），线的走向就是会被打到的方向，
 *   线的粗细由 `data.width` 决定；wall 的溅射 `direction` 用服务端算出的反向光轴，墙面接触就是光路终点。
 * 运动：光束粒子沿 path 密铺、几乎不散（一条稳定的线），贴地一层薄霜表示冷气扫过；命中处冰棱向外炸、
 *   霜雾下沉；撞墙时霜团沿光轴反向溅开。
 * 数：`data.rate`／`data.shardRate` 由本招威力派生决定光束的粒子密度与霜屑量；`data.impactCount`（威力派生）
 *   决定命中冰棱数与墙面霜花量；`data.pierce` 决定光束分股的层数。
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
                },
                {
                    name: "beam_ground", bind: "path", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    shape: { kind: "polyline" }, positionJitter: [0.45, 0.08, 0.45],
                    rate: 20, direction: "up", speed: [0.0, 0.04], gravity: 0.006, drag: 0.94,
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0xCFEAF8, alpha: [0.4, 0], light: "world", maxParticles: 90
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
                    name: "crystal_shell", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 12, at: 2 }, amount: 1,
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.0, 0.03], spin: 18,
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 30
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
        wall: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wall_bloom", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "impactCount", fallback: 28 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 50
                },
                {
                    name: "wall_shard", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "impactCount", fallback: 28 } }, amount: 2,
                    orient: "direction", shape: { kind: "cone", radius: 0.7, angleDegrees: 60, thickness: 0.7 },
                    direction: "shape", speed: [0.1, 0.3], gravity: 0.02, spin: 20,
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icebeam", 1, IcebeamDefinition);
