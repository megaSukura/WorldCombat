/**
 * 奇迹之眼 的粒子语言（P5 视觉语言 v2）＋ 一处自定义场景。
 *
 * 一句话：施法者额前凝起一只淡紫的眼睛，一道心眼线连到对手身上；对手被一道明确的目标轮廓框住，
 *   同时施法者自己头上亮起一圈小准星——目标端与自端是两条独立的生命周期，谁先到期就先 fade。
 *
 * 色相家族：念紫（0xB07CE8）做心眼主体，青（0x7CD8E8）做瞳孔环与自准星，淡紫白（0xE0C8FF）做细节。
 * 层次：凝神（起手，念光向额前收）→ 看穿（一条心眼线＋施法者眼前的眼形短开合＋目标轮廓）
 *   → 持眼（目标低密度念环、自己准星慢转，各自随自身的托管效果结束）→ 褪去／自照收束／被挡／落空。
 * 起击收：windup（凝神）→ focus（自照亮起）→ read（看穿）→ hold＋focus_hold（两端持续）→ fade／focus_end（各自走空）。
 * 范围：单体心眼，心眼线画的正是被看穿的那个人；目标轮廓按真实碰撞箱勾出；心眼距离由 reach 决定。
 * 运动：心眼线是施法者与目标之间一条瞬时连线（bind path + shape polyline，整条边同时采样，不是沿线飞行的前沿）；
 *   念环由外向内收；自准星绕自己的头慢转，绑在本次命中窗口这条托管效果上。
 * 数：心眼线与念环的密度读 data.motes（特攻派生），抬起的命中级数读 data.added（决定轮廓亮度与眼形大小）。
 * 自定义场景 world_combat:move_miracleeye_eye：施法者眼前的稳定眼形短开合，以及目标身上逐帧勾出的碰撞箱轮廓；
 *   自身（眼形，青白）与被识别目标（轮廓，念紫）据此清楚分开。每帧画线，不生成粒子或实体。
 */
const MiracleeyeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_eye", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE0C8FF, alpha: [0.55, 0], light: "full", maxParticles: 26
                }
            ]
        },
        focus: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "focus_flash", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "added", fallback: 2 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7CD8E8, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        read: {
            duration: 32,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "eye_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 14,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xB07CE8, alpha: [0.85, 0], light: "full", maxParticles: 74
                },
                {
                    name: "eye_halo", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 18], size: [0.3, 0.1],
                    color: 0xB07CE8, alpha: [0.5, 0], light: "full", maxParticles: 44
                }
            ]
        },
        focus_hold: {
            exit: { drain: 18 },
            emitters: [
                {
                    name: "reticle", bind: "source", height: 1.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "added", fallback: 4 }, shape: { kind: "ring", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.04], spin: 5,
                    lifetime: [10, 16], size: [0.1, 0.02], alphaMode: "sin",
                    color: 0x7CD8E8, alpha: [0.4, 0], light: "full", maxParticles: 16
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hold_eye", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.06], spin: 4,
                    lifetime: [12, 20], size: [0.12, 0.02], alphaMode: "sin",
                    color: 0xB07CE8, alpha: [0.34, 0], light: "full", maxParticles: 22
                }
            ]
        },
        focus_end: {
            duration: 20,
            emitters: [
                {
                    name: "reticle_loose", bind: "source", height: 1.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.08, 0.01],
                    color: 0x7CD8E8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_eye", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xB07CE8, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_dust", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC8C0D8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC8C0D8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_miracleeye", 1, MiracleeyeDefinition);

// 眼形短开合 + 目标轮廓。role:"eye" 在施法者眼前画一只随进度张开又合上的眼（青白）；
// role:"target" 按目标真实碰撞箱逐帧勾出竖框与顶底环（念紫），随记录层结束而消失。
WorldCombatClient.scene("world_combat:move_miracleeye_eye", 1, function (frame) {
    const entry: CombatSceneEntry<{
        role?: string; self?: string; target?: string; startTick?: number; duration?: number;
        added?: number; motes?: number; right?: number[]; width?: number; height?: number;
    }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const motes = typeof data.motes === "number" && data.motes > 0 ? data.motes : 14;
    const added = typeof data.added === "number" && data.added > 0 ? data.added : 1;
    const alpha = Math.max(0x66, Math.min(0xEE, Math.round(0xAA * (0.7 + added / 3))));
    const purple = (alpha << 24) | 0xB07CE8;
    if (data.role === "target") {
        if (!data.target) return;
        const anchor = JSON.parse(frame.anchor(data.target));
        if (!anchor) return;
        const hw = (typeof data.width === "number" && data.width > 0 ? data.width : 0.9) / 2 + 0.14;
        const hh = typeof data.height === "number" && data.height > 0 ? data.height : 1.4;
        const base = anchor.y + 0.03, top = anchor.y + hh, sides = 8;
        frame.ring(anchor.x, base, anchor.z, hw, purple);
        frame.ring(anchor.x, top, anchor.z, hw, purple);
        for (let i = 0; i < sides; i++) {
            const a = i * Math.PI * 2 / sides, px = anchor.x + Math.cos(a) * hw, pz = anchor.z + Math.sin(a) * hw;
            frame.line(px, base, pz, px, top, pz, purple);
        }
        return;
    }
    const anchor = JSON.parse(frame.anchor(data.self || entry.source));
    if (!anchor) return;
    const now = frame.serverTick();
    const start = typeof data.startTick === "number" ? data.startTick : now;
    const duration = typeof data.duration === "number" && data.duration > 0 ? data.duration : 22;
    const progress = Math.max(0, Math.min(1, (now - start) / duration));
    const open = Math.sin(Math.PI * progress);
    if (open <= 0.02) return;
    const right = Array.isArray(data.right) && data.right.length === 3 ? data.right : [1, 0, 0];
    const cx = anchor.x, cy = anchor.y + anchor.height * 0.72, cz = anchor.z;
    const halfW = 0.32 + 0.05 * Math.min(1, motes / 30), halfH = 0.02 + open * 0.2;
    const white = (0xF0 << 24) | 0xE0C8FF, cyan = (0xFF << 24) | 0x7CD8E8;
    const steps = 14;
    function eyePoint(t: number, sign: number): number[] {
        const along = (t - 0.5) * 2 * halfW, bulge = sign * halfH * Math.sin(Math.PI * t);
        return [cx + right[0] * along, cy + bulge, cz + right[2] * along];
    }
    for (let i = 0; i < steps; i++) {
        const a = eyePoint(i / steps, 1), b = eyePoint((i + 1) / steps, 1);
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], white);
        const c = eyePoint(i / steps, -1), d = eyePoint((i + 1) / steps, -1);
        frame.line(c[0], c[1], c[2], d[0], d[1], d[2], white);
    }
    const pr = 0.06 + open * 0.06, psteps = 12;
    for (let i = 0; i < psteps; i++) {
        const a = i * Math.PI * 2 / psteps, b = (i + 1) * Math.PI * 2 / psteps;
        const ax = Math.cos(a) * pr, ay = Math.sin(a) * pr, bx = Math.cos(b) * pr, by = Math.sin(b) * pr;
        frame.line(cx + right[0] * ax, cy + ay, cz + right[2] * ax, cx + right[0] * bx, cy + by, cz + right[2] * bx, cyan);
    }
    frame.line(cx + right[0] * halfW, cy, cz + right[2] * halfW, cx + right[0] * halfW, cy + 0.03, cz + right[2] * halfW, cyan);
    frame.line(cx - right[0] * halfW, cy, cz - right[2] * halfW, cx - right[0] * halfW, cy + 0.03, cz - right[2] * halfW, cyan);
});
