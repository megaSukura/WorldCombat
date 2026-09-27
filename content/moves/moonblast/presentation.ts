/**
 * 月亮之力 / moonblast 的客户端表现。
 *
 * 一句话：施法者抬头，头顶的月光一缕缕拢进身前一颗球里 → 球飞出去、拖一条月尘 → 命中炸开一牙弯月与放射辉光
 * → 若被夺走集中力，目标头顶再飘起几缕月光散掉；飞空则只落一撮月尘。
 * 色相家族：月白与暖金（0xF6EFD0 / 0xFFF3D6）为主，银紫（0xE4DEFF）作暗部，近白只给击点；粉尘收在灰白。
 * 拍子：起 charge（拢光）→ 行 flight（球＋月尘）→ 击 burst（月牙）→ 夺 drain（可选的降攻）／空 fizzle。
 * 范围：这招只作用在目标一点，各层都绑 `projectile`／`target`／`source`；命中主体是一枚固定轮廓的短月牙与有限射线，
 *   由自定义场景 move_moonblast_crescent 画在真实命中点，粒子只补一小撮月尘，不再铺成大范围球面/环。
 * 运动：charge 的月光向内收拢，flight 沿弹道直飞，月牙与射线在垂直入射方向的平面里展开。
 * 数：`data.moon`（月华比例，世界事实派生）抬高弥散与亮度，`data.orb`（判定半径派生）决定球的画多大，
 *   `data.motes`（特攻派生）决定被夺光点数量。
 */
const MoonblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "tempo", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: { data: "moonRate", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [{ data: "moonSize", fallback: 0.34 }, 0.05],
                    color: 0xFFF3D6, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 18, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.11], spin: 8,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF6EFD0, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flight: {
            duration: 70,
            exit: { stop: 60, drain: 16 },
            emitters: [
                {
                    name: "ball", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 12], size: [{ data: "orb", fallback: 0.4 }, 0.06],
                    color: 0xFFF3D6, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "trail", bind: "projectile", fit: "none", trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xE4DEFF, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        // 命中主体改由自定义场景 move_moonblast_crescent 画固定轮廓的短月牙与有限射线；
        // 这里只补一小撮月尘作粒子余韵，不再用大球面/大环铺开，避免读成范围伤害。
        burst: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 3 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [{ data: "orb", fallback: 0.4 }, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 8
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.02,
                    lifetime: [10, 22], size: [0.05, 0.01],
                    color: 0xE4DEFF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 34,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "leak", bind: "target", offset: [0, 0.65, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.11],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFF3D6, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xE4DEFF, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_moonblast", 1, MoonblastDefinition);

/**
 * 命中点的短月牙与有限射线（自定义客户端场景，不生成粒子或实体）。
 * 服务端在真实命中会造成伤害时传回命中点、真实入射方向、爆开半径、辉光道数与起始刻。
 * 这里在垂直于入射方向的平面里，用**固定数量**的图集贴图摆出两条同心弧组成一枚弯月，再按 `data.rays` 从命中点
 * 向外画有限条辉光射线；整枚月牙按 `data.life` 淡出。只复用原生图集与既定绘制接口，没有粒子生灭或额外实体开销。
 */
const MoonblastCrescentSprite = "cobblemon:particle/generic/impact/impact_fairy";
const MoonblastRaySprite = "cobblemon:particle/generic/star";

function moonblastNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function moonblastVec(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n)))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function moonblastColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

WorldCombatClient.scene("world_combat:move_moonblast_crescent", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    const now = frame.serverTick();
    const life = Math.max(1, moonblastNumber(data.life, 16));
    const age = Math.max(0, now - moonblastNumber(data.start, now));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    const at = entry.position;
    const burst = Math.max(0.4, Math.min(2.4, moonblastNumber(data.burst, 0.95)));
    const orb = Math.max(0.16, Math.min(1.1, moonblastNumber(data.orb, 0.45)));
    const rays = Math.max(0, Math.min(20, Math.round(moonblastNumber(data.rays, 8))));
    const moon = Math.max(0, Math.min(1, moonblastNumber(data.moon, 0.6)));
    // 光轴：真实弹体入射方向；在垂直于它的平面里摆出月牙与辉光。
    const dir = moonblastVec(data.direction, null) || [0, 1, 0];
    const dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
    const nx = dir[0] / dl, ny = dir[1] / dl, nz = dir[2] / dl;
    const reference = Math.abs(ny) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = ny * reference[2] - nz * reference[1], ry = nz * reference[0] - nx * reference[2], rz = nx * reference[1] - ny * reference[0];
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = ry * nz - rz * ny, uy = rz * nx - rx * nz, uz = rx * ny - ry * nx;
    const spin = now * 0.22;
    // 有限辉光射线：道数由机制给出，长度随爆开半径与月华。
    for (let i = 0; i < rays; i++) {
        const angle = spin + i * Math.PI * 2 / Math.max(1, rays);
        const ox = Math.cos(angle) * rx + Math.sin(angle) * ux, oy = Math.cos(angle) * ry + Math.sin(angle) * uy, oz = Math.cos(angle) * rz + Math.sin(angle) * uz;
        const length = burst * (1.25 + 0.2 * moon);
        frame.line(at[0], at[1], at[2], at[0] + ox * length, at[1] + oy * length, at[2] + oz * length,
            moonblastColour(0.55 * fade, 0xF6EFD0));
    }
    // 一枚短月牙：两条同心弧（外弧 + 内弧）用固定数量的贴图摆出弯月轮廓，内弧更短更暗，形成月牙缺角。
    function moonblastArc(count: number, radius: number, span: number, height: number, alpha: number, rgb: number, frameOffset: number): void {
        for (let i = 0; i < count; i++) {
            const t = count <= 1 ? 0.5 : i / (count - 1);
            const angle = -span / 2 + span * t;
            const ox = Math.cos(angle) * rx + Math.sin(angle) * ux, oy = Math.cos(angle) * ry + Math.sin(angle) * uy, oz = Math.cos(angle) * rz + Math.sin(angle) * uz;
            frame.sprite(MoonblastCrescentSprite, at[0] + ox * radius, at[1] + oy * radius, at[2] + oz * radius,
                height, angle * 57.2958, moonblastColour(alpha * fade, rgb), Math.abs(Math.round(now * 0.5 + i + frameOffset)) % 7, true);
        }
    }
    moonblastArc(9, burst, 2.4, orb * 1.05, 0.95, 0xFFFFFF, 0);
    moonblastArc(7, burst * 0.66, 1.9, orb * 0.8, 0.7, 0xFFF3D6, 3);
    frame.sprite(MoonblastRaySprite, at[0], at[1], at[2], orb * 1.25, 0, moonblastColour(0.9 * fade, 0xFFF3D6), 0, true);
});
