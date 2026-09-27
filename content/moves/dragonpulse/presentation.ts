/**
 * 龙之波动 / dragonpulse 的客户端表现。
 *
 * 一句话：张口把龙息压成一圈圈青紫的同心波面，从嘴前沿直线成串推出去，扫过的目标身上炸开龙属冲击，
 * 尽头留下一缕散去的余波。
 * 色相家族：龙青（0x7FE6D0）为主体、紫（0x9A6BE0）作波面内芯，强调用原型 impact_dragon。
 * 拍子：起（charge 聚气）→ 推（release 脱手；自定义场景 wave 逐刻用原生坐标画少量竖立波面；
 *   自定义场景 chain 画链前沿逐段亮起）→ 收（impact 逐个命中、fade 散去）。
 * 范围：wave 的每片波面法线沿真实 3D 飞向（服务端 WorldGeometry.basis 给出的 right/up），线两侧由
 *   `data.thickness`（波面厚度）决定；chain 的宽读 `data.width`（连锁线宽），前沿由服务端逐段推进。
 * 数：`data.rings`（波面道数）就是画出的波面片数，`data.intensity`（本击威力 / 76）抬高亮度，
 *   命中个数写进 `data.hits`。不再用统一环圈或整段撒点代替本招主体。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonpulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.18, 0.05], spin: 6,
                    color: 0x7FE6D0, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "focus", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xB79AF0, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "mouth_ring", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.24, 0.5],
                    color: 0x7FE6D0, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "rings", fallback: 3 }, interval: 3, repeats: 2 },
                    shape: { kind: "cone", radius: 0.36, angleDegrees: 22 },
                    direction: "shape", speed: [0.1, 0.3], spread: 10,
                    lifetime: [5, 11], size: [0.12, 0.03],
                    color: 0xA6F3E2, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xD8FBF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 16], size: [0.13, 0.04],
                    color: 0xA6F3E2, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "mist", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 },
                    shape: { kind: "hemisphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.3, 0.1],
                    color: 0x7FB6A8, alpha: [0.22, 0], light: "world", maxParticles: 60
                },
                {
                    name: "residual", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [9, 18], size: [0.06, 0.02],
                    color: 0x9FE3D2, alpha: [0.5, 0], light: "world", maxParticles: 100
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonpulse", 1, DragonpulseDefinition);

function dragonpulseNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function dragonpulseVec(value: any): number[] | null {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n))
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : null;
}
function dragonpulseColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 少量稳定竖立波面（自定义客户端场景，不生成粒子或实体）：服务端逐刻把真实弹位与稳定 3D 基
 * （方向 forward 的 right/up）传来，这里沿飞向串起 `data.rings` 片、每片法线沿飞向的圆环；
 * 弹体一停就不再续期，末片按 `data.life` 淡去。判定与表现共用同一走向，俯仰发射同样成立。
 */
WorldCombatClient.scene("world_combat:move_dragonpulse_wave", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const at = entry.position;
    const forward = dragonpulseVec(data.direction), right = dragonpulseVec(data.right), up = dragonpulseVec(data.up);
    if (!Array.isArray(at) || at.length !== 3 || !forward || !right || !up) return;
    const rings = Math.max(2, Math.min(7, Math.round(dragonpulseNumber(data.rings, 3))));
    const thickness = Math.max(0.2, Math.min(1.2, dragonpulseNumber(data.thickness, 0.42)));
    const intensity = Math.max(0.4, Math.min(2.6, dragonpulseNumber(data.intensity, 1)));
    const life = Math.max(1, dragonpulseNumber(data.life, 6));
    const age = Math.max(0, frame.serverTick() - dragonpulseNumber(data.tick, frame.serverTick()));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    const radius = thickness * (1.15 + 0.2 * intensity);
    const spacing = Math.max(0.3, thickness * 1.7);
    const steps = 14;
    for (let i = 0; i < rings; i++) {
        const gap = -spacing * i;
        const cx = at[0] + forward[0] * gap, cy = at[1] + forward[1] * gap, cz = at[2] + forward[2] * gap;
        const rr = radius * (0.82 + 0.18 * (i / rings));
        const tint = i % 2 === 0 ? 0x7FE6D0 : 0xB79AF0;
        for (let k = 0; k < steps; k++) {
            const a = k * Math.PI * 2 / steps, b = (k + 1) * Math.PI * 2 / steps;
            const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
            frame.line(
                cx + right[0] * ca * rr + up[0] * sa * rr, cy + right[1] * ca * rr + up[1] * sa * rr, cz + right[2] * ca * rr + up[2] * sa * rr,
                cx + right[0] * cb * rr + up[0] * sb * rr, cy + right[1] * cb * rr + up[1] * sb * rr, cz + right[2] * cb * rr + up[2] * sb * rr,
                dragonpulseColour((0.7 - 0.25 * i / rings) * fade, tint));
        }
    }
});

/**
 * 连锁前沿（自定义客户端场景，不生成粒子或实体）：服务端沿原 3D 方向逐段推进扫描，每刻把已到达的
 * 起点 `start` 与当前前沿 `front` 续期；这里在两者之间画一束细带，前沿另点一小段亮头。墙截断时前沿
 * 就是真实阻挡点，看不到墙后的假延伸。
 */
WorldCombatClient.scene("world_combat:move_dragonpulse_chain", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const start = dragonpulseVec(data.start), front = dragonpulseVec(data.front), forward = dragonpulseVec(data.direction);
    const right = dragonpulseVec(data.right), up = dragonpulseVec(data.up);
    if (!start || !front || !forward || !right || !up) return;
    const width = Math.max(0.4, Math.min(3.0, dragonpulseNumber(data.width, 1.6)));
    const intensity = Math.max(0.4, Math.min(2.6, dragonpulseNumber(data.intensity, 1)));
    const life = Math.max(1, dragonpulseNumber(data.life, 18));
    const age = Math.max(0, frame.serverTick() - dragonpulseNumber(data.tick, frame.serverTick()));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    const spread = width * 0.3 * (0.7 + 0.3 * intensity);
    const ribbons = 5;
    for (let i = 0; i < ribbons; i++) {
        const t = (i / (ribbons - 1)) * 2 - 1;
        const ox = right[0] * spread * t + up[0] * spread * ((i % 2 === 0 ? 1 : -1) * 0.5);
        const oy = right[1] * spread * t + up[1] * spread * ((i % 2 === 0 ? 1 : -1) * 0.5);
        const oz = right[2] * spread * t + up[2] * spread * ((i % 2 === 0 ? 1 : -1) * 0.5);
        frame.line(start[0] + ox, start[1] + oy, start[2] + oz, front[0] + ox, front[1] + oy, front[2] + oz,
            dragonpulseColour((0.45 - 0.08 * Math.abs(t)) * fade, i === 2 ? 0xB79AF0 : 0x7FE6D0));
    }
    frame.line(front[0], front[1], front[2], front[0] + forward[0] * 0.5, front[1] + forward[1] * 0.5, front[2] + forward[2] * 0.5,
        dragonpulseColour(0.85 * fade, 0xD8FBF0));
});
