/**
 * 变硬 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者体表由内向外析出一层晶亮的棱壳，碎晶沿表面铺开、围成一层反光的晶环；
 *   壳在身时一整圈棱面清晰可见，每挨一击只在真实接触侧裂一道短纹与裂光，被一记重击打裂时整层炸成碎晶飞散。
 *
 * 色相家族：冰青灰（0xCFE8E4）为主体，冷白（0xDCEFEB）做高光，深青（0x9FB8B3）做余韵；没有第二个色相。
 * 层次：内聚（起）／晶片、晶环与亮光（结晶）／棱面壳（持壳，自定义场景）／接触侧短裂纹（受击，自定义场景）／炸开的碎晶（末）。
 * 起击收：clench（凝）→ crystal（结晶）→ shell（持壳，自定义场景）→ crack（接触侧裂纹，自定义场景）→ shatter（碎裂）。
 * 范围：晶环绑身体、fit none，半径按 `data.scale`（实际晶壳半径 / 1.1）推出，画出来的壳就是护到的体积。
 *   持壳棱面与受击裂纹读同一份 `data.radius`／`data.point`／`data.direction`，判定与表现共用端点。
 * 运动：晶片由体内向外铺、贴体停住；晶环向外推开；持壳时棱面围成一圈静止的晶笼；被打时裂纹从真实接触点沿切面辐射；
 *   碎裂时碎晶整层向外、受重力落下。
 * 数：晶面量绑 `data.facets`（防御与等级派生），受击深度绑 `data.depth`（原始来伤 / 真实阈值），尺寸绑 `data.scale`。
 * 持续状态：持壳棱面由自定义场景绑在 guard 池上逐帧绘制，池被驱散或结束时同步停止；不是表面稀疏闪点。
 * 与旧表现的取舍：不再用一个定向 arc 冒充「贴实际接触面的裂纹」——裂纹是自定义场景在真实接触点切面上画的短线。
 */
const HardenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        clench: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "clench_glint", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.9, spin: 16,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xDCEFEB, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        crystal: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "crystal_shard", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "facets", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.88, spin: 18,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0xCFE8E4, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "crystal_ring", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 20], size: [0.4, 0.7], sizeMode: "index",
                    color: 0x9FB8B3, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "crystal_glint", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 10, interval: 5, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xDCEFEB, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        shatter: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shatter_fall", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "facets", fallback: 14 } },
                    shape: { kind: "sphere", radius: 1.1 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.9, spin: 24,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0x9FB8B3, alpha: [0.65, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shatter_flash", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 1.1 },
                    direction: "outward",
                    lifetime: [10, 12], size: [0.5, 0.9],
                    color: 0xDCEFEB, alpha: [0.65, 0], light: "full", bloom: 0.5, maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_harden", 1, HardenDefinition);

/**
 * 持壳棱面：读 `data.facets`（晶面数）、`data.radius`／`data.scale`（实际晶壳半径），围着身体画一圈静止的晶笼线。
 * 逐帧按同一组棱面重绘，数量固定、无粒子生灭；由 guard 池的 onEffect 拥有，池结束或驱散时条目消失即停。
 */
WorldCombatClient.scene("world_combat:move_harden_shell", 1, function (frame) {
    const entry: CombatSceneEntry<{ facets?: number; scale?: number; radius?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.6, anchor.height); }
    const radius = Math.max(0.4, typeof data.radius === "number" ? data.radius : (data.scale || 1) * 1.1);
    const centreY = y + height * 0.5;
    const ribs = Math.max(6, Math.min(20, Math.round(data.facets || 14)));
    const steps = 4;
    const body = (0x99 << 24) | 0xCFE8E4, edge = (0x77 << 24) | 0xDCEFEB;
    const equator: number[][] = [];
    for (let i = 0; i < ribs; i++) {
        const angle = (i / ribs) * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle);
        let prev: number[] | null = null;
        for (let k = 0; k <= steps; k++) {
            const t = k / steps, phi = Math.PI * (0.14 + 0.72 * t);
            const py = centreY + radius * Math.cos(phi), ring = radius * Math.sin(phi);
            const point = [x + cos * ring, py, z + sin * ring];
            if (prev) frame.line(prev[0], prev[1], prev[2], point[0], point[1], point[2], i % 2 === 0 ? body : edge);
            if (k === 2) equator.push(point);
            prev = point;
        }
    }
    for (let i = 0; i < equator.length; i++) {
        const a = equator[i], b = equator[(i + 1) % equator.length];
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], edge);
    }
});

/**
 * 接触侧短裂纹：只读服务端确认的 `data.point`（被击者真实 AABB 表面上的接触点，弹体取真实落点）、
 * `data.direction`（接触侧切面法线）与 `data.depth`。
 * 在接触点的切面上从中心向外辐射几道短线，深度越深越长越亮；没有接触点时退回身体位置，不虚构方向。
 * 达到真实阈值那一击的碎片剥落由 skill 侧的 shatter 粒子整层播放，这里只负责贴面的裂纹读数。
 */
WorldCombatClient.scene("world_combat:move_harden_crack", 1, function (frame) {
    const entry: CombatSceneEntry<{ point?: number[]; direction?: number[]; depth?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const depth = Math.max(0, Math.min(1, typeof data.depth === "number" ? data.depth : 0));
    const base = Array.isArray(data.point) && data.point.length === 3 ? data.point : entry.position;
    const px = base[0], py = base[1], pz = base[2];
    const frameIndex = Math.floor(frame.serverTick() * 0.5) % 7;
    frame.sprite("cobblemon:particle/generic/impact/impact_ice", px, py, pz, 0.35 + depth * 0.5, 0,
        (0x99 << 24) | 0xEFFBF8, frameIndex, true);
    let nx = 0, ny = 1, nz = 0;
    if (Array.isArray(data.direction) && data.direction.length === 3) {
        const vx = data.direction[0], vy = data.direction[1], vz = data.direction[2];
        const length = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (length > 1e-6) { nx = vx / length; ny = vy / length; nz = vz / length; }
    }
    const hx = Math.abs(ny) > 0.9 ? 1 : 0, hy = Math.abs(ny) > 0.9 ? 0 : 1, hz = 0;
    let t1x = ny * hz - nz * hy, t1y = nz * hx - nx * hz, t1z = nx * hy - ny * hx;
    const t1 = Math.sqrt(t1x * t1x + t1y * t1y + t1z * t1z) || 1;
    t1x /= t1; t1y /= t1; t1z /= t1;
    const t2x = ny * t1z - nz * t1y, t2y = nz * t1x - nx * t1z, t2z = nx * t1y - ny * t1x;
    const lines = 3 + Math.round(depth * 4), reach = 0.1 + depth * 0.3;
    const color = (0xCC << 24) | 0xEFFBF8;
    for (let i = 0; i < lines; i++) {
        const angle = (i / lines) * Math.PI * 2;
        const dx = t1x * Math.cos(angle) + t2x * Math.sin(angle);
        const dy = t1y * Math.cos(angle) + t2y * Math.sin(angle);
        const dz = t1z * Math.cos(angle) + t2z * Math.sin(angle);
        frame.line(px + nx * 0.02, py + ny * 0.02, pz + nz * 0.02,
            px + dx * reach, py + dy * reach, pz + dz * reach, color);
    }
});
