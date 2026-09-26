/**
 * 心之眼 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者凝神，一串淡紫的思绪沿视线牵到对手身上，眼睛处的念环张开、对手被一圈读光罩住；
 *   读的期间，目标脚下随它真实速度画出一条细短的趋势虚线（只表示当前走向）；下一次命中打中所读者时，
 *   线从目标缩回施法者并熄灭。
 *
 * 色相家族：念紫（0xB07CE8／0x8A5CD0）为主体，近白紫（0xE8D8FF）只做思绪高光，灰白（0xCFC6D8）收尘。
 * 层次：凝神（起手，思绪向眼内收）→ 读穿（一条思绪线＋眼睛念环＋目标读光环）→ 读势（脚下趋势虚线，自定义场景）
 *   → 兑现（读线缩回＋念波散开）→ 褪去。
 * 起击收：windup（凝神）→ read（读穿）→ trend（读势，绑在读数标记上）→ strike（兑现）／fade（走空）。
 * 范围：单体读，趋势虚线与目标读环画的正是被读的那个人；读距离由 reach 决定。
 * 运动：思绪从施法者沿视线飞向目标；兑现时读线从目标缩回施法者，念波向外散。
 * 数：读线与念环的密度、趋势虚线的疏密读 data.motes（特攻派生），照亮时长读 data.reveal，兑现强度读 data.intensity。
 * 趋势线只是当前速度趋势：目标停步即收成一点，不是预测动画或复制录音。
 */
const MindreaderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_thought", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8D8FF, alpha: [0.5, 0], light: "full", maxParticles: 26
                }
            ]
        },
        read: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "read_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 16,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xB07CE8, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "read_eyes", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 18], size: [0.22, 0.06],
                    color: 0xE8D8FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "read_halo", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0x8A5CD0, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "read_spark", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xE8D8FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "strike_wave", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [12, 20], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xB07CE8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "strike_rings", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.15],
                    lifetime: [12, 18], size: [0.36, 0.12],
                    color: 0x8A5CD0, alpha: [0.55, 0], light: "full", maxParticles: 12
                },
                {
                    name: "strike_return", bind: "path", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 12 }, direction: "shape", speed: [0.05, 0.16], spread: 10,
                    lifetime: [8, 14], size: [0.1, 0.02], alphaMode: "sin",
                    color: 0xB07CE8, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "strike_dust", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_thought", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xB07CE8, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_fade", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 20
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
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mindreader", 1, MindreaderDefinition);

// 读势：服务端每 4 刻按目标真实速度更新 path 两端，这里逐帧画一条细短方向虚线、末端带箭头；
// 目标停步（moving=0）只留脚下一点；绑在读数标记效果上，读结束或被兑现时随标记一起清理。
WorldCombatClient.scene("world_combat:move_mindreader_trend", 1, function (frame) {
    const entry: CombatSceneEntry<{ path?: any[]; target?: string; moving?: number; motes?: number; outline?: number; intensity?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    let a = path[0] as number[], b = path[1] as number[];
    if (!Array.isArray(a) || !Array.isArray(b)) return;
    // 读光量（特攻派生）决定虚线疏密，运动强度决定颜色亮度：机制值直接驱动画面。
    const motes = typeof data.motes === "number" && data.motes > 0 ? data.motes : 14;
    const intensity = typeof data.intensity === "number" ? data.intensity : 1;
    const alpha = Math.max(0x66, Math.min(0xEE, Math.round(0xAA * intensity)));
    const purple = (alpha << 24) | 0xB07CE8;
    const outline = typeof data.outline === "number" && data.outline > 0 ? data.outline : 0.5;
    // 目标轮廓圈跟随实体逐帧；不可解析时退回采样点。
    if (data.target) {
        const anchor = JSON.parse(frame.anchor(data.target));
        if (anchor) a = [anchor.x, a[1], anchor.z];
        frame.ring(a[0], a[1], a[2], outline, (Math.round(alpha * 0.5) << 24) | 0xB07CE8);
    }
    if (!data.moving) {
        frame.ring(a[0], a[1], a[2], 0.1, purple);
        return;
    }
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 1e-3)) { frame.ring(a[0], a[1], a[2], 0.1, purple); return; }
    const ux = dx / length, uy = dy / length, uz = dz / length;
    // 读光越多，短划越密：dash 随 motes 在 0.14..0.26 间变化。
    const dash = 0.14 + 0.12 * Math.min(1, motes / 30), gap = dash * 0.7, step = dash + gap;
    for (let d = 0; d < length; d += step) {
        const e = Math.min(length, d + dash);
        frame.line(a[0] + ux * d, a[1] + uy * d, a[2] + uz * d,
            a[0] + ux * e, a[1] + uy * e, a[2] + uz * e, purple);
    }
    // 箭头：水平面内两条回收短线，只标出实际运动方向。
    const head = Math.min(0.35, length * 0.5);
    const px = -uz, pz = ux, plen = Math.sqrt(px * px + pz * pz) || 1;
    const hx = px / plen * head * 0.55, hz = pz / plen * head * 0.55;
    frame.line(b[0], b[1], b[2], b[0] - ux * head + hx, b[1] - uy * head, b[2] - uz * head + hz, purple);
    frame.line(b[0], b[1], b[2], b[0] - ux * head - hx, b[1] - uy * head, b[2] - uz * head - hz, purple);
});
