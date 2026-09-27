/**
 * 冰冻光束 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边聚起冷雾，随后一条笔直的冰蓝冷光沿真实三维瞄准方向亮起、在实际墙面处截断并停留片刻；
 *   一路迸着霜屑，被光路烧到的人身上炸开一圈冰棱与霜雾，撞到墙时在墙面溅起霜花，光束结束的一刻整条同时熄灭。
 * 色相家族：冰蓝 0x9FD8F0／0x6FB7E0 与近白 0xEAF6FF 为主；一个冷色相，没有第二个色相。
 * 层次：聚雾（windup 粒子）→ 光束本体（自定义场景 move_icebeam_axis）→ 命中冰棱（impact 粒子）→ 墙面霜花（wall 粒子）。
 * 范围：光束轴在自定义场景里用服务端射线得到的同一组三维端点画中心亮线，外壳按同一半宽同轴铺开——不再用世界
 *   Y 偏移把光轴抬高；wall 的溅射 `direction` 用服务端算出的反向光轴，墙面接触就是光路终点。
 * 运动：中心线沿真实光轴几乎不动（一条稳定的线），命中处冰棱向外炸、霜雾下沉；撞墙时霜团沿光轴反向溅开。
 * 数：`data.intensity` 由本招威力派生决定光束亮度与外壳层数；`data.impactCount`（威力派生）决定命中冰棱数与墙面霜花量。
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

const IcebeamAxisCore = "cobblemon:particle/generic/smoke/glowingsmoke_cyan";
const IcebeamAxisShard = "cobblemon:particle/generic/ice/iceshard";
const IcebeamAxisFrost = "cobblemon:particle/generic/ice/icy_snow";

function icebeamNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function icebeamVec(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n)))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function icebeamColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 光束轴主体：服务端每次扫描传回同一条光路的真实三维端点与半宽。中心画一条亮线，外壳沿与光轴垂直的两条基向量
 * 按同一半宽铺开冰霜贴图——中心线与外壳同轴，不再把光轴用世界 Y 偏移抬高；墙面接触点单独结霜花。固定数量图形，
 * 没有粒子生灭或额外实体。
 */
WorldCombatClient.scene("world_combat:move_icebeam_axis", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = icebeamVec(path[0], null), b = icebeamVec(path[1], null);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 0.01)) return;
    const ux = dx / length, uy = dy / length, uz = dz / length;
    const width = Math.max(0.2, Math.min(2, icebeamNumber(data.width, 0.7)));
    const intensity = Math.max(0.4, Math.min(2.6, icebeamNumber(data.intensity, 1)));
    const scale = Math.max(0.2, Math.min(2.5, icebeamNumber(data.scale, 1)));
    // 与光轴垂直的稳定基：一个参考向量叉乘光轴得到 right，再叉乘得到 up。
    const reference = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = uy * reference[2] - uz * reference[1];
    let ry = uz * reference[0] - ux * reference[2];
    let rz = ux * reference[1] - uy * reference[0];
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const vx = ry * uz - rz * uy, vy = rz * ux - rx * uz, vz = rx * uy - ry * ux;

    frame.line(a[0], a[1], a[2], b[0], b[1], b[2], icebeamColour(0.92, 0xEAF6FF));

    const rings = Math.max(4, Math.min(10, Math.round(length * 0.6)));
    const sides = 6;
    const shellAlpha = 0.45 + 0.12 * Math.min(1, intensity);
    for (let i = 1; i < rings; i++) {
        const t = i / rings;
        const cx = a[0] + dx * t, cy = a[1] + dy * t, cz = a[2] + dz * t;
        for (let s = 0; s < sides; s++) {
            const angle = s * Math.PI * 2 / sides + t * 1.3;
            const ox = Math.cos(angle) * rx + Math.sin(angle) * vx;
            const oy = Math.cos(angle) * ry + Math.sin(angle) * vy;
            const oz = Math.cos(angle) * rz + Math.sin(angle) * vz;
            frame.sprite(IcebeamAxisFrost, cx + ox * width, cy + oy * width, cz + oz * width,
                0.14 + 0.05 * intensity, 0, icebeamColour(shellAlpha, 0xBFE8FF), (i + s) % 4, true);
        }
    }
    const beads = Math.max(6, Math.min(24, Math.round(length)));
    for (let i = 0; i < beads; i++) {
        const t = (i + 0.5) / beads;
        frame.sprite(IcebeamAxisShard, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t,
            0.11 + 0.04 * intensity, 0, icebeamColour(0.8, 0x9FD8F0), i % 4, false);
    }
    const wall = icebeamVec(data.wall, null);
    if (wall) {
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI * 2 / 6;
            const ox = Math.cos(angle) * rx + Math.sin(angle) * vx;
            const oy = Math.cos(angle) * ry + Math.sin(angle) * vy;
            const oz = Math.cos(angle) * rz + Math.sin(angle) * vz;
            frame.sprite(IcebeamAxisFrost, wall[0] + ox * 0.35, wall[1] + oy * 0.35, wall[2] + oz * 0.35,
                0.22 + 0.06 * intensity, 0, icebeamColour(0.9, 0xEAF6FF), i % 4, true);
        }
        frame.ring(wall[0], wall[1], wall[2], 0.5 * scale, icebeamColour(0.5, 0x6FB7E0));
    }
});
