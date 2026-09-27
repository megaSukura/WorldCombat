/**
 * 磨爪 / honeclaws 的客户端表现。
 *
 * 一句话：施术者抬起前爪，在身前交叠着快速刮几下，火星只从两爪真正相交的那一点迸出；磨利后交点一亮，
 *   随后锋口还在的时间里，两爪尖端各留一点极小的冷光。
 *
 * 位置与朝向：身体中心取锚点脚点 + 半身高；前/右/上由锚点的 bodyYaw 实时算出（MC 前向 [-sin yaw, 0, cos yaw]），
 *   所以旋转 90°/180°、体型不同时两爪都仍在身前相交，不需要服务端按刻重发朝向。锚点不可用时回退到载荷里的
 *   中心与基向量。两爪是身前的一对抽象锋口，不声称是骨骼动画。
 *
 * 色相家族：冷钢白 0xE8F2FF 为爪锋主体，青灰 0xA9BEDC 作余韵，暖火星 0xFFC98A 与金 0xFFE9A8 只落在交点。
 * 拍子：hone（起手内按 scrapes 逐拍对磨，到 prepare 即止）→ settle（提交后交点一亮、火星迸出）
 *   → hum（锋口窗口内两爪尖冷光，随窗口存亡）→ fade。
 * 数：对磨拍数由服务端算出的 strokes 驱动，画面按可数的拍画；交点火星数由 sparks 驱动。
 * 持续：hum 由 WorldFeedback.onEffect 绑在真实的锋口窗口上，窗口关闭或被清除时同步收回。
 */
const HoneClawsScratch = "cobblemon:particle/generic/scratch";
const HoneClawsSpark = "cobblemon:particle/generic/sparkle/smallsparkle";
const HoneClawsEmber = "cobblemon:particle/generic/fire/ember";

function honeclawsVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function honeclawsNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

/** 一对相交的爪锋：绕交点按 right/up 撑开，交点在 (x, y, z)。 */
function honeclawsEdge(frame: CombatClientFrame, x: number, y: number, z: number,
                       right: number[], up: number[], spread: number, rise: number): void {
    frame.line(x - right[0] * spread + up[0] * rise, y - right[1] * spread + up[1] * rise, z - right[2] * spread + up[2] * rise,
        x + right[0] * spread - up[0] * rise, y + right[1] * spread - up[1] * rise, z + right[2] * spread - up[2] * rise, 0xD0E8F2FF | 0);
    frame.line(x + right[0] * spread + up[0] * rise, y + right[1] * spread + up[1] * rise, z + right[2] * spread + up[2] * rise,
        x - right[0] * spread - up[0] * rise, y - right[1] * spread - up[1] * rise, z - right[2] * spread - up[2] * rise, 0xD0E8F2FF | 0);
}

WorldCombatClient.scene("world_combat:move_honeclaws", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;

    const anchor = JSON.parse(frame.anchor(entry.source));
    const yaw = Math.PI * honeclawsNumber(anchor ? anchor.bodyYaw : null, NaN) / 180;
    let forward: number[], right: number[], up: number[];
    let cx: number, cy: number, cz: number, height: number;
    if (anchor && isFinite(yaw)) {
        height = Math.max(0.5, honeclawsNumber(anchor.height, 1.4));
        forward = [-Math.sin(yaw), 0, Math.cos(yaw)];
        right = [-Math.cos(yaw), 0, -Math.sin(yaw)];
        up = [0, 1, 0];
        cx = anchor.x; cy = anchor.y + height * 0.5; cz = anchor.z;
    } else {
        height = Math.max(0.5, honeclawsNumber(data.height, 1.4));
        forward = honeclawsVector(data.forward, [0, 0, 1]);
        right = honeclawsVector(data.right, [1, 0, 0]);
        up = honeclawsVector(data.up, [0, 1, 0]);
        cx = entry.position[0]; cy = entry.position[1]; cz = entry.position[2];
    }
    const reach = Math.max(0.1, honeclawsNumber(data.reach, height * 0.25));
    const lift = honeclawsNumber(data.lift, height * 0.10);
    const span = Math.max(0.12, honeclawsNumber(data.span, 0.28));
    const rise = Math.max(0.05, honeclawsNumber(data.rise, 0.12));
    const scale = Math.max(0.4, honeclawsNumber(data.scale, 1));
    const ix = cx + forward[0] * reach, iy = cy + lift, iz = cz + forward[2] * reach;
    const start = honeclawsNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const moment = data.moment;

    if (moment === "hone") {
        // 到 prepare 立即停画；对磨按 scrapes 逐拍推进，一次只有一对爪。
        const duration = Math.max(1, honeclawsNumber(data.duration, 20));
        if (age >= duration) return;
        const beats = Math.max(2, Math.min(4, Math.round(honeclawsNumber(data.strokes, 2))));
        const beat = duration / beats;
        const t = (age % beat) / beat;
        const grind = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
        const along = (t - 0.5) * reach * 0.5;
        const bx = ix + forward[0] * along, by = iy + forward[1] * along, bz = iz + forward[2] * along;
        const spread = span * (0.72 + 0.28 * grind);
        honeclawsEdge(frame, bx, by, bz, right, up, spread, rise);
        frame.sprite(HoneClawsScratch, bx, by, bz, 0.3 * scale, 42, 0xD0E8F2FF | 0, 6, true);
        frame.sprite(HoneClawsScratch, bx, by, bz, 0.3 * scale, -42, 0xD0E8F2FF | 0, 5, true);
        // 只有两爪磨到最近时才从交点迸出短火星。
        if (grind > 0.55) frame.sprite(HoneClawsEmber, bx, by, bz, 0.05 * scale, 0, 0xC8FFC98A | 0, 0, true);
        return;
    }

    if (moment === "settle") {
        const flash = Math.max(0, 1 - age / 8);
        const sparks = Math.max(0, Math.min(20, Math.round(honeclawsNumber(data.sparks, 0))));
        if (flash > 0) {
            frame.sprite(HoneClawsScratch, ix, iy, iz, 0.44 * scale, 42, 0xF0E8F2FF | 0, 6, true);
            frame.sprite(HoneClawsScratch, ix, iy, iz, 0.44 * scale, -42, 0xF0E8F2FF | 0, 5, true);
        }
        for (let s = 0; s < sparks; s++) {
            const a = s * 2.39996;
            const r = 0.1 + 0.42 * Math.min(1, age / 14);
            const fade = Math.max(0, 1 - age / 20);
            const alpha = Math.round(224 * fade);
            const sx = ix + Math.cos(a) * r, sy = iy + 0.05 + Math.sin(a * 1.3) * 0.12 - age * 0.012, sz = iz + Math.sin(a) * r;
            frame.sprite(HoneClawsEmber, sx, sy, sz, 0.06 * scale, 0, (alpha << 24 | 0xFFC98A) | 0, 0, true);
        }
        if (flash > 0) frame.sprite(HoneClawsSpark, ix, iy, iz, 0.12 * flash * scale, 0, 0xC0FFE9A8 | 0, 0, true);
        return;
    }

    if (moment === "hum") {
        const glow = 0.5 + 0.5 * Math.sin(age * 0.25);
        const tip = span * 0.95;
        const alpha0 = Math.round(70 + 40 * glow), alpha1 = Math.round(80 + 50 * glow);
        const ox = right[0] * tip, oz = right[2] * tip, oy = up[1] * rise;
        frame.sprite(HoneClawsSpark, ix - ox, iy + oy, iz - oz,
            0.05 + 0.02 * glow, 0, (alpha0 << 24 | 0xD8E4F0) | 0, 0, true);
        frame.sprite(HoneClawsSpark, ix + ox, iy + oy, iz + oz,
            0.06 + 0.02 * glow, 0, (alpha1 << 24 | 0xF0F6FF) | 0, 0, true);
        return;
    }

    if (moment === "fade") {
        const t = Math.min(1, age / 22);
        for (let s = 0; s < 12; s++) {
            const a = s * 2.39996;
            const r = 0.1 + 0.4 * t;
            const alpha = Math.round(120 * (1 - t));
            frame.sprite(HoneClawsSpark, ix + Math.cos(a) * r, iy + Math.sin(a * 1.3) * 0.1 - t * 0.4, iz + Math.sin(a) * r,
                0.06, 0, (alpha << 24 | 0xA9BEDC) | 0, 0, false);
        }
    }
});
