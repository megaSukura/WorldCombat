/**
 * 捏碎 / crushgrip 的客户端表现。
 *
 * 一句话：目标两侧先浮出两片暗铁的掌影，随即合拢捏出一个实心的暗色光团、石屑沿掌口崩出；高举式再把它整个人
 *   提起、按住，然后砸回地面，落点炸开一圈冲击；举不起来就只松掌放出一点暗尘。
 * 色相家族：暗铁（0x8A8794）主体、冷白（0xD8D4E0）强调、深灰（0x403C4A）余韵；单一色相。
 * 拍子：起 loom（掌影张开）→ 击 grip（合拢）→ 提 rise / 持 hoist → 落 fall / 着地 slam → 空 whiff / 松掌 release。
 * 范围：grip 的掌口环半径以 0.7 格为书写基准（`fit: "none"` 由 `data.scale = 实际掌口半径 / 0.7` 缩一次），画出的圈就是被捏住的范围。
 * 主体：两片巨掌由自定义场景 `world_combat:move_crushgrip/palms` 在接触点两侧显式画出、合拢；粒子只作碎屑、拖尾与冲击。
 * 运动：掌影自两侧向中心合拢；碎屑沿掌口外抛带重力；hoist 的上升拖痕贴着目标真实的上升轨迹，slam 的尘柱按
 *   `data.drop`（实际到达的落高）铺开、只有真的被举起才会出现。
 * 数：`data.motes`（物攻与体重派生）决定碎屑量，`data.intensity`（本击威力 / 100）抬高亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CrushgripDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        loom: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "palm", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12], drag: 0.9, spin: 8,
                    lifetime: [8, 16], size: [0.22, 0.04],
                    color: 0x8A8794, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "haze", bind: "source", offset: [0, 0, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.3, 0.08],
                    color: 0x403C4A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        grip: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "closing", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, at: 0, interval: 4 },
                    shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.08, 0.24],
                    lifetime: [9, 16], size: [0.4, 0.7], sizeMode: "index",
                    color: 0x8A8794, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "core", bind: "target", offset: [0, 0, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 15], size: [0.34, 0.08],
                    color: 0x403C4A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "chips", bind: "target", offset: [0, 0, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.28], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.13, 0.03], sizeMode: "index",
                    color: 0x5A5560, alpha: [0.7, 0], light: "world", maxParticles: 160
                },
                {
                    name: "snap", bind: "target", offset: [0, 0.4, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xD8D4E0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 54
                }
            ]
        },
        rise: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "rise", bind: "target", offset: [0, 0.2, 0], fit: "none", trail: { minDistance: 0.12 },
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "circle", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "up", speed: { data: "lift", fallback: 0.25 },
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0xD8D4E0, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        hoist: {
            duration: 20,
            exit: { stop: 2, drain: 12 },
            emitters: [
                {
                    name: "grip_hold", bind: "target", offset: [0, 0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 10, shape: { kind: "torus", radius: 0.7, thickness: 0.6 },
                    direction: "inward", speed: [0.01, 0.05], spin: 16,
                    lifetime: [8, 15], size: [0.26, 0.06],
                    color: 0x8A8794, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fall: {
            duration: 20,
            exit: { stop: 2, drain: 8 },
            emitters: [{
                name: "fall", bind: "target", offset: [0, 0, 0], fit: "body", trail: { minDistance: 0.12 },
                particle: "world_combat_core:cobblemon/generic/speedlines",
                rate: 26, shape: { kind: "box", size: [0.35, 1, 0.35] },
                direction: "down", speed: [0.1, 0.3], lifetime: [5, 10], size: [0.18, 0.04],
                color: 0x8A8794, alpha: [0.5, 0], light: "world", maxParticles: 70
            }]
        },
        release: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "open", bind: "target", offset: [0, 0.1, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [9, 16], size: [0.26, 0.08],
                    color: 0x403C4A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "shock", bind: "target", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0x8A8794, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "target", offset: [0, 0, 0], height: 0.15, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "circle", radius: 0.7, thickness: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.07, 0.3], gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x5A5560, alpha: [0.7, 0], light: "world", maxParticles: 180
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.25, 0], height: 0.2, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xD8D4E0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [9, 16], size: [0.28, 0.08],
                    color: 0x403C4A, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crushgrip", 1, CrushgripDefinition);

function crushgripTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function crushgripNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

// 两片巨掌在接触点两侧、沿瞄准方向的水平垂直轴上显式绘制：起手先张开（moment "open"），
// 捏住时从两侧合拢（moment "close"）；掌口只按服务端传的实际 gripRadius（width）缩放一次。
// 不生成粒子或实体，随动作 present key 结束。
WorldCombatClient.scene("world_combat:move_crushgrip/palms", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const point = crushgripTriple(data.point) || crushgripTriple(entry.position);
    if (point === null) return;
    const dir = crushgripTriple(data.direction);
    const mouth = Math.max(0.35, Math.min(1.4, crushgripNumber(data.width, 0.7)));
    const moment = String(data.moment || "close");
    const age = Math.max(0, frame.serverTick() - crushgripNumber(data.start, frame.serverTick()));
    let rx = 1, rz = 0;
    if (dir !== null) {
        const hx = dir[0], hz = dir[2], len = Math.sqrt(hx * hx + hz * hz);
        if (len > 1e-6) { rx = -hz / len; rz = hx / len; }
    }
    const wide = 1.5 + mouth, closed = Math.max(0.25, mouth);
    const span = moment === "open" ? Math.max(0, Math.min(1, age / 10)) : Math.max(0, Math.min(1, age / 8));
    const gap = moment === "open" ? closed + (wide - closed) * (0.45 + 0.55 * span) : wide + (closed - wide) * span;
    const life = moment === "open" ? 16 : 22;
    const progress = Math.max(0, Math.min(1, age / life));
    const alpha = Math.round((moment === "open" ? 130 : 195) * (1 - progress) * (1 - progress));
    if (alpha <= 6) return;
    const y = point[1];
    const main = (alpha << 24 | 0x8A8794) | 0;
    const bright = (Math.round(alpha * 0.9) << 24 | 0xD8D4E0) | 0;
    for (let side = -1; side <= 1; side += 2) {
        const px = point[0] + rx * gap * side, pz = point[2] + rz * gap * side;
        const wx = px + rx * 0.3 * side, wz = pz + rz * 0.3 * side;
        frame.line(wx, y, wz, px, y, pz, main);
        frame.line(px, y, pz, point[0], y + 0.04, point[2], bright);
        frame.line(px, y + 0.28, pz, point[0], y + 0.04, point[2], main);
        frame.line(px, y - 0.28, pz, point[0], y + 0.04, point[2], main);
        frame.line(px, y + 0.28, pz, px, y - 0.28, pz, bright);
    }
});
