/**
 * 日光束 / solarbeam 的客户端表现。
 *
 * 一句话：日光从头顶落下来、在施法者身上收成一小团，随后一束金白的光柱从聚光核同轴铺出去、被方块截停在墙前，
 *         走廊里被贯穿的活体各自炸开一簇草绿的碎光。
 * 色相家族：金白（0xFFFBE8 近白的芯、0xFFD873 主体）＋中性尘；草绿（impact_grass）只作为命中点的小面积属性强调。
 * 拍子：起 gather（聚光）→ 击 beam（光柱铺开）＋ pierce（贯穿点）＋ wall（墙前截停，或 fizzle 落空）→ 收（光柱淡出）。
 * 本体：光柱由自定义场景 `move_solarbeam_axis` 按服务端同一三维端点画中心亮线＋同轴外壳＋截面环——竖直或俯仰瞄准时
 *     外壳仍绕真实光轴铺开，不再是水平面上的一个矩形；判定与表现共用这组端点。
 * 数：`data.light`（日光与特攻换算）决定光柱与聚光点的密度，`data.intensity`（威力/120）决定亮度，
 *     `data.pierce`（贯穿上限）决定外壳环数与亮斑量，`data.scale`（半宽/0.62）与 `data.width`（实际半宽）决定截面尺度。
 */
const SolarBeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 22 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather_sun", bind: "source", offset: [0, 1.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: { data: "light", fallback: 14 }, shape: { kind: "sphere", radius: 0.75 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 15], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xFFD873, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.9, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "light", fallback: 12 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [6, 13], size: [0.08, 0.02],
                    color: 0xFFF6C8, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xD8C48C, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        beam: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "light", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                }
            ]
        },
        pierce: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "pierce_core", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "light", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEFFFC0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "pierce_sear", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "light", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        wall: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wall_flash", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "light", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.35 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "wall_dust", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "light", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fizzle_scatter", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0xD8C89C, alpha: [0.3, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fizzle_motes", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_solarbeam", 1, SolarBeamDefinition);

const SolarBeamAxisCore = "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";
const SolarBeamAxisGlow = "cobblemon:particle/generic/orb/xsunboost";
const SolarBeamAxisEdge = "cobblemon:particle/generic/speedlines";

function solarbeamNumberAt(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function solarbeamVecAt(value: any): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return null;
}

function solarbeamColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 光柱主体：服务端传回同一条光路的真实三维端点与半宽（被墙截到哪里就画到哪里）。中心一条亮线，外壳沿与光轴垂直的
 * 两条基向量按真实半宽铺开金白光斑，形成可读的截面与外壳；竖直/俯仰瞄准时基向量仍稳定。固定数量图形，没有粒子生灭
 * 或额外实体。
 */
WorldCombatClient.scene("world_combat:move_solarbeam_axis", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = solarbeamVecAt(path[0]), b = solarbeamVecAt(path[1]);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 0.05)) return;
    const ux = dx / length, uy = dy / length, uz = dz / length;
    // 与光轴垂直的稳定基：竖直瞄准时改用世界轴作参考，截面不会塌成一条线。
    const reference = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = uy * reference[2] - uz * reference[1];
    let ry = uz * reference[0] - ux * reference[2];
    let rz = ux * reference[1] - uy * reference[0];
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const vx = ry * uz - rz * uy, vy = rz * ux - rx * uz, vz = rx * uy - ry * ux;
    const width = Math.max(0.2, Math.min(2, solarbeamNumberAt(data.width, 0.7)));
    const scale = Math.max(0.4, Math.min(2.2, solarbeamNumberAt(data.scale, 1)));
    const intensity = Math.max(0.5, Math.min(2.6, solarbeamNumberAt(data.intensity, 1)));
    const pierce = Math.max(1, Math.min(7, solarbeamNumberAt(data.pierce, 2)));

    frame.line(a[0], a[1], a[2], b[0], b[1], b[2], solarbeamColour(0.95, 0xFFFBE8));

    // 同轴外壳：绕光轴一圈固定数量的亮斑，半径就是真实半宽；截面一目了然。
    const rings = Math.max(4, Math.min(12, Math.round(length * 0.5)));
    const sides = 6;
    const shellAlpha = 0.4 + 0.12 * Math.min(2, intensity);
    for (let i = 1; i <= rings; i++) {
        const t = i / (rings + 1);
        const cx = a[0] + dx * t, cy = a[1] + dy * t, cz = a[2] + dz * t;
        for (let s = 0; s < sides; s++) {
            const angle = s * Math.PI * 2 / sides + t * 1.1;
            const ox = Math.cos(angle) * rx + Math.sin(angle) * vx;
            const oy = Math.cos(angle) * ry + Math.sin(angle) * vy;
            const oz = Math.cos(angle) * rz + Math.sin(angle) * vz;
            frame.sprite(SolarBeamAxisCore, cx + ox * width, cy + oy * width, cz + oz * width,
                (0.16 + 0.04 * intensity) * scale, 0, solarbeamColour(shellAlpha, 0xFFFBE8), (i + s) % 13, true);
        }
    }
    // 光芯亮点与边缘掠过：数量由贯穿上限与亮度决定。
    const beads = Math.max(6, Math.min(26, Math.round(length * 0.8)));
    for (let i = 0; i < beads; i++) {
        const t = (i + 0.5) / beads;
        frame.sprite(SolarBeamAxisGlow, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t,
            (0.18 + 0.05 * intensity) * scale, 0, solarbeamColour(0.75, 0xFFD873), i % 13, true);
    }
    const edge = Math.max(2, Math.min(6, Math.round(pierce * 1.2)));
    for (let i = 0; i < edge; i++) {
        const t = (i + 0.5) / edge;
        const side = (i % 2 === 0 ? 1 : -1) * width;
        frame.sprite(SolarBeamAxisEdge, a[0] + dx * t + rx * side, a[1] + dy * t + ry * side, a[2] + dz * t + rz * side,
            0.2 * scale, 0, solarbeamColour(0.6, 0xFFF6C8), i % 3, true);
    }
});
