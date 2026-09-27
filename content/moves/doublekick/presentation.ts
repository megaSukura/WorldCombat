/**
 * 二连踢 / doublekick 的客户端表现。
 *
 * 一句话：施法者单脚站定，第一脚贴地低扫把对手从地上挑起，紧接第二脚前踹把目标送出去；两脚各由一只足影带出，
 *   命中处一记亮白冲击，第一脚多一撮向上飞起的尘，第二脚沿真实踹飞方向扫出前送的尘。
 * 色相家族：暖琥珀（0xE8B87A、0xC9964F）做脚风与尘土，白（0xFFF4E0）只给命中那一抹；第二脚略更亮。
 * 拍子：起 raise（抬脚）→ 一 hook（低位短弧）→ 中 hit1（挑人）→ 二 finisher（向前足影）→ 中 hit2（踹飞）→ 收 settle。
 * 主体在自定义场景 move_doublekick_kick：服务端每脚发同一方向 `data.direction`、`data.reach`／`data.span` 与
 *   `data.start`／`data.duration`；客户端第一脚把足影沿低位短弧扫过扇面，第二脚把足影沿方向向前踹出，
 *   两脚共用同一个 key，第一脚收束后第二脚才开始，不再并排重叠整片风尘。
 * 命中位移依服务端实际结算：`data.lift`／`data.push` 是原生受击位移真正走出的距离，抗拒退时为 0；`data.launch`
 *   为 0 时前送尘层不发射。`data.dust`（物攻派生）绑定发射量，`data.intensity`（每脚威力派生）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DoublekickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "brace", bind: "source", offset: [0, 0.08, 0], height: 0.05, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 14 }, interval: 2, repeats: 2 },
                    shape: { kind: "box", size: [0.5, 0.08, 0.5] }, direction: "outward", speed: [0.03, 0.12], spread: 24,
                    gravity: 0.04, drag: 0.9, lifetime: [7, 13], size: [0.11, 0.02],
                    color: 0xC9964F, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        hit1: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "lift", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "liftParticles", fallback: 0 }, at: 1 },
                    shape: { kind: "box", size: [0.5, 0.1, 0.5] }, direction: "up", speed: [0.18, 0.42], spread: 18,
                    gravity: 0.02, drag: 0.94, lifetime: [9, 15], size: [0.09, 0.02],
                    color: 0xC9964F, alpha: [0.6, 0], light: "world", maxParticles: 44
                }
            ]
        },
        hit2: {
            duration: 20,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.34], spread: 24,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.42, maxParticles: 60
                },
                {
                    name: "launch", bind: "target", offset: [0, 0.35, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "launch", fallback: 0 }, at: 1 },
                    shape: { kind: "cylinder", radius: 0.28, length: 0.7 }, direction: "shape", speed: [0.14, 0.4], spread: 20,
                    drag: 0.9, lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8B87A, alpha: [0.55, 0], light: "world", maxParticles: 52
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                { orient: "heading",
                    name: "empty", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, angleDegrees: { data: "span", fallback: 80 } },
                    direction: "shape", speed: [0.04, 0.14], spread: 20, gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC9964F, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        settle: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0xC9964F, alpha: [0.35, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doublekick", 1, DoublekickDefinition);

/** 二连踢两脚的主体：第一脚低位短弧、第二脚向前足影；方向与扇面来自服务端判定。 */
function doublekickFinite(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function doublekickClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function doublekickColour(alpha: number, rgb: number): number { return ((Math.round(255 * doublekickClamp(alpha, 0, 1)) << 24) | rgb) | 0; }
function doublekickDirection(value: any, fallback: number[]): number[] {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); })
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : fallback;
}

WorldCombatClient.scene("world_combat:move_doublekick_kick", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; reach?: number; span?: number; dust?: number; intensity?: number;
        alternate?: number; lift?: number; direction?: number[]; start?: number; duration?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data || data.lifecycle) return;
    const direction = doublekickDirection(data.direction, [0, 0, 1]);
    const flat = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]) || 1;
    const ux = direction[0] / flat, uz = direction[2] / flat;
    const origin = entry.position;
    const reach = Math.max(0.5, doublekickFinite(data.reach, 2.7));
    const span = doublekickClamp(doublekickFinite(data.span, 80), 20, 180);
    const start = doublekickFinite(data.start, frame.serverTick());
    const duration = Math.max(1, doublekickFinite(data.duration, 8));
    const progress = doublekickClamp((frame.serverTick() - start) / duration, 0, 1);
    const intensity = doublekickClamp(doublekickFinite(data.intensity, 1), 0.4, 2.4);
    const fade = 1 - progress * 0.35;
    const foot = "cobblemon:particle/generic/foot";

    if (data.moment === "hook") {
        // 第一脚：贴地低扫，足影沿扇面从一侧扫到另一侧；抬起高度由 data.lift 派生。
        const base = Math.atan2(uz, ux), half = span * Math.PI / 360;
        const ang = base - half + 2 * half * progress;
        const r = reach * 0.92;
        const fx = origin[0] + Math.cos(ang) * r, fz = origin[2] + Math.sin(ang) * r;
        const liftAmt = doublekickClamp(doublekickFinite(data.lift, 0), 0, 0.85);
        const low = origin[1] - 0.42 + liftAmt * progress;
        // 扫过的低位弧线：按进度画当前这一段。
        const tail = 0.35;
        const begin = Math.max(0, progress - tail);
        let px = 0, py = 0, pz = 0, started = false;
        for (let k = 0; k <= 6; k++) {
            const t = begin + (progress - begin) * k / 6;
            const a = base - half + 2 * half * t;
            const x = origin[0] + Math.cos(a) * r, z = origin[2] + Math.sin(a) * r;
            if (started) frame.line(px, py, pz, x, origin[1] - 0.4, z, doublekickColour(0.6 * fade, 0xF2ECDD));
            px = x; py = origin[1] - 0.4; pz = z; started = true;
        }
        frame.sprite(foot, fx, low, fz, 0.42 + 0.06 * intensity, 12, doublekickColour(0.95, 0xFFF4E0), 0, true);
        const dust = doublekickClamp(Math.round(doublekickFinite(data.dust, 12) / 6), 1, 4);
        for (let d = 0; d < dust; d++) {
            const a = d * 2.0 + progress * 7.0, rr = 0.1 + 0.2 * (d / dust);
            frame.sprite("cobblemon:particle/generic/earth", fx + Math.cos(a) * rr, origin[1] - 0.36, fz + Math.sin(a) * rr,
                0.1 + 0.03 * intensity, 0, doublekickColour(0.45 * fade, 0xC9964F), 0, false);
        }
        return;
    }

    // 第二脚：沿真实方向向前踹出的足影，位移依实际结果（server 只在真正推到时才给 data.push 之外的尘）。
    const out = reach * (0.4 + 0.6 * progress);
    const fx = origin[0] + ux * out, fz = origin[2] + uz * out;
    frame.line(origin[0] + ux * reach * 0.2, origin[1] - 0.05, origin[2] + uz * reach * 0.2, fx, origin[1] - 0.05, fz,
        doublekickColour(0.5 * fade, 0xF2ECDD));
    frame.sprite(foot, fx, origin[1] - 0.1 + 0.1 * progress, fz, 0.5 + 0.08 * intensity, 0, doublekickColour(0.95, 0xFFFFFF), 0, true);
    const gust = doublekickClamp(Math.round(doublekickFinite(data.dust, 12) / 6), 1, 5);
    for (let d = 0; d < gust; d++) {
        const a = d * 2.0, rr = 0.12 + 0.22 * (d / gust);
        frame.sprite("cobblemon:particle/generic/tinydust", fx - ux * rr + uz * rr * 0.4, origin[1] - 0.05 + 0.12 * (d / gust) - 0.06,
            fz - uz * rr - ux * rr * 0.4, 0.08 + 0.03 * intensity, 0, doublekickColour(0.5 * fade, 0xE8B87A), 0, false);
    }
});
