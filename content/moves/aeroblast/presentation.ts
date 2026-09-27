/**
 * 气旋攻击 / aeroblast 的客户端表现。
 *
 * 一句话：施法者口边的空气先旋起、越拧越紧，随后朝锁定方向连续压出三拍灰青涡流细束；每一拍都从身前一直
 * 连到真实的射线落点（首个活体或挡墙处），命中处在目标身上炸开一小团涡光，打到墙则只在墙面收束。
 * 色相家族：灰青与近白（swirlingwind／spiral／impact_flying），近白高光只给命中与暴击那一下。
 * 拍子：起（charge 拧气）→ 射（自定义场景 move_aeroblast_vortex 画每拍旋转截面细束到真实端点）→
 *   爆（burst 命中炸开；wall 墙面收束）→ 强调（crit）。
 * 范围：涡流细束主体是自定义场景，读服务端这一拍 `trace` 的真实 `data.path` 起点与落点，画多长判定就到哪——
 *   挡墙会截短这一拍；每拍寿命 `data.life` 短于拍隙，拍完即灭，不糊成常亮束。粒子只承担命中/墙面/头部聚气，
 *   不承担飞行判定。
 * 数：`data.spiral`（特攻派生）决定沿轴截面的密度，`data.radius` 决定单拍判定粗细，`data.pulse`／`data.beats`
 *   让第几拍可读，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const AeroblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge_spiral", bind: "source", offset: [0, 0.55, 0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 30, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.18], spread: 10, spin: 16,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xCFEFF5, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "charge_core", bind: "source", offset: [0, 0.55, 0.35], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/vanilla/spiral",
                    rate: 22, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.1], spread: 8, spin: 22,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 44
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_core", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.18, 0.55], spread: 12, spin: 10,
                    lifetime: [7, 14], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 110
                },
                {
                    name: "burst_wind", bind: "point", offset: [0, 0.3, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: 8, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.34], spread: 16, drag: 0.9,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xBCE6F2, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "wall_scatter", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.12, 0.4], spread: 24, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xCFEFF5, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 18, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0xBFCED6, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_core", bind: "point", offset: [0, 0.55, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "spiral", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.22, 0.65], spread: 10, spin: 12,
                    lifetime: [7, 14], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14], spread: 18, gravity: 0.01, drag: 0.92,
                    lifetime: [12, 20], size: [0.16, 0.02],
                    color: 0xC9E2EA, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aeroblast", 1, AeroblastDefinition);

const AeroblastVortexCore = "cobblemon:particle/generic/swirlingwind";
const AeroblastVortexThread = "cobblemon:particle/vanilla/spiral";

function aeroblastVortexNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function aeroblastVortexVec(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n)))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function aeroblastVortexColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 涡流细束主体（自定义客户端场景，不生成粒子或实体）：服务端每一拍传回这一拍真实的起点与端点（首个活体或挡墙处）、
 * 判定粗细、螺旋量、起始刻与剩余寿命。这里沿轴等分若干截面，每个截面把风旋贴图按与光轴垂直的稳定基摆成一圈；
 * 圈的相位随轴向位置与时间旋转，连起来读作一支由旋转截面拧成的短涡流锥，整束按 data.life 淡出，尾流不长过拍隙。
 * 固定数量图形，无粒子生灭或额外实体开销，也不承担命中判定。
 */
WorldCombatClient.scene("world_combat:move_aeroblast_vortex", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = aeroblastVortexVec(path[0], null), b = aeroblastVortexVec(path[1], null);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 0.01)) return;
    const ux = dx / length, uy = dy / length, uz = dz / length;
    const reference = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = uy * reference[2] - uz * reference[1];
    let ry = uz * reference[0] - ux * reference[2];
    let rz = ux * reference[1] - uy * reference[0];
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const vx = ry * uz - rz * uy, vy = rz * ux - rx * uz, vz = rx * uy - ry * ux;
    const scale = Math.max(0.6, Math.min(2.2, aeroblastVortexNumber(data.scale, 1)));
    const radius = Math.max(0.18, Math.min(1.5, aeroblastVortexNumber(data.radius, 0.5) * Math.max(0.7, Math.min(1.3, scale))));
    const spiral = Math.max(12, Math.min(80, aeroblastVortexNumber(data.spiral, 30)));
    const intensity = Math.max(0.4, Math.min(2.6, aeroblastVortexNumber(data.intensity, 1)));
    const life = Math.max(1, aeroblastVortexNumber(data.life, 5));
    const now = frame.serverTick();
    const age = Math.max(0, now - aeroblastVortexNumber(data.start, now));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    frame.line(a[0], a[1], a[2], b[0], b[1], b[2], aeroblastVortexColour(0.8 * fade, 0xEAFBFF));
    const slices = Math.max(3, Math.min(14, Math.round(length * 1.2) + 2));
    const sides = 6;
    const spin = now * 0.55;
    const size = 0.16 + 0.1 * intensity;
    for (let i = 1; i < slices; i++) {
        const t = i / slices;
        const cx = a[0] + dx * t, cy = a[1] + dy * t, cz = a[2] + dz * t;
        const phase = spin + t * spiral * 0.22;
        const ringRadius = radius * (0.55 + 0.45 * Math.sin(Math.PI * t));
        for (let s = 0; s < sides; s++) {
            const angle = s * Math.PI * 2 / sides + phase;
            const ox = Math.cos(angle) * rx + Math.sin(angle) * vx;
            const oy = Math.cos(angle) * ry + Math.sin(angle) * vy;
            const oz = Math.cos(angle) * rz + Math.sin(angle) * vz;
            const texture = s % 2 === 0 ? AeroblastVortexCore : AeroblastVortexThread;
            frame.sprite(texture, cx + ox * ringRadius, cy + oy * ringRadius, cz + oz * ringRadius,
                size, angle * 57.2958, aeroblastVortexColour((0.78 - 0.4 * t) * fade, 0xCFEFF5),
                Math.abs(Math.round(spin * 3 + t * 24 + s)) % 27, true);
        }
    }
    for (let s = 0; s < 4; s++) {
        const angle = s * Math.PI * 2 / 4 + spin;
        const ox = Math.cos(angle) * rx + Math.sin(angle) * vx;
        const oy = Math.cos(angle) * ry + Math.sin(angle) * vy;
        const oz = Math.cos(angle) * rz + Math.sin(angle) * vz;
        frame.sprite(AeroblastVortexCore, b[0] + ox * radius * 0.5, b[1] + oy * radius * 0.5, b[2] + oz * radius * 0.5,
            0.22 + 0.1 * intensity, 0, aeroblastVortexColour(0.9 * fade, 0xFFFFFF), s % 27, true);
    }
});
