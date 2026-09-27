/**
 * 极光幕 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把天光拉下来（windup：头顶卷起极光预告）→ 拉开时地边亮起一圈光边、中心升起一片光尘
 * （curtain）→ 幕下由固定对象——几道横向虹带与区域轮廓——逐帧画出真实的有效区域（field custom scene）→
 * 幕下的人身上牵一条细丝连回幕心（thread）→ 来袭攻击撞上时折出一道亮带（block）→ 天光收拢（fade）。
 *
 * 场地高度：`data.ceiling` 是机制用 WorldGeometry.blockHit 实测的可挂高度；横向虹带与轮廓都贴在它以下，
 * 低顶棚时虹带随之压短，绝不穿出屋顶。施放前空间不够会真实施放失败，所以这里不需要强撑。
 * 固定对象用 WorldCombatClient.scene 逐帧绘制：区域轮廓是真实 radius 的地面环，横向虹带按 radius 裁出弦长，
 * 都随 field 生命周期存在与消失；不再用统一环圈或光柱冒充主体。
 *
 * 色相家族：极光本身就是多色带，所以用 shinesparkle_rainbow 的原色作主体，青 0x7FE6D8 与紫 0xB79CF0
 *   只做横向虹带与描边，近白 0xEAF9F5 给地层光边。
 * 层次：拉光（起）／地边圈＋升光（铺开）／固定横向虹带与轮廓（持续）／细丝连幕（受护）／折光挡下（事件）／收。
 * 数：横向虹带条数绑定 data.ribbons（少量、稳定），范围与弦长绑定 data.radius，顶高受 data.ceiling 裁剪；
 *   挡下的爆发量读 data.burst。
 */
const AuroraVeilDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "draw", bind: "source", offset: [0, 1.8, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 26], size: [0.18, 0.04], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 26 }
            ]
        },
        curtain: {
            duration: 48,
            exit: { stop: 20, drain: 32 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [16, 26], size: [0.6, 1.0], sizeMode: "sin",
                    color: 0x7FE6D8, alpha: [0.6, 0], light: "full", maxParticles: 44 },
                { name: "rise", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "ribbons", fallback: 8 }, interval: 3, repeats: 4 },
                    shape: { kind: "circle", radius: { data: "spreadRadius", fallback: 2.4 } },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [20, 34], size: [0.22, 0.05], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 120 }
            ]
        },
        cover: {
            duration: 12,
            exit: { stop: 6, drain: 8 },
            emitters: [
                { name: "wrap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "sin",
                    alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 20 }
            ]
        },
        thread: {
            exit: { drain: 24 },
            emitters: [
                { name: "thread", bind: "path", height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: { data: "ribbons", fallback: 8 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.004, 0.016], drag: 0.96,
                    lifetime: [12, 22], size: [0.09, 0.02], sizeMode: "sin",
                    alpha: [0.45, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "catch", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.12, 0.02],
                    color: 0xEAF9F5, alpha: [0.5, 0], light: "full", maxParticles: 24 }
            ]
        },
        block: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                { name: "fold", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "burst", fallback: 16 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.88,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xEAF9F5, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 34 },
                { name: "deflect", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "burst", fallback: 12 } }, shape: { kind: "line", length: 1.3 }, orient: "direction", direction: "shape",
                    speed: [0.18, 0.3],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xB79CF0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24 }
            ]
        },
        fade: {
            duration: 36,
            exit: { stop: 12, drain: 30 },
            emitters: [
                { name: "lower", bind: "point", offset: [0, { data: "ceiling", fallback: 3.4 }, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "ribbons", fallback: 8 }, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4 } },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.95,
                    lifetime: [22, 36], size: [0.2, 0.03],
                    alpha: [0.4, 0], light: "world", maxParticles: 80 },
                { name: "ring", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: { data: "radius", fallback: 4 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [18, 28], size: [0.3, 0.06],
                    color: 0x7FE6D8, alpha: [0.3, 0], light: "world", maxParticles: 30 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_auroraveil", 1, AuroraVeilDefinition);

/** 近白／青／紫三色按亮度系数取色，输出客户端 line/ring 需要的带符号 ARGB。 */
function auroraVeilShade(rgb: number, factor: number): number {
    const r = Math.min(255, Math.round(((rgb >> 16) & 255) * factor));
    const g = Math.min(255, Math.round(((rgb >> 8) & 255) * factor));
    const b = Math.min(255, Math.round((rgb & 255) * factor));
    return ((0xFF << 24) | (r << 16) | (g << 8) | b) | 0;
}

// 固定对象：区域轮廓与横向虹带逐帧绘制，随 field 的 keep 一起存在与消失；判定与画面共用同一个 radius/ceiling。
WorldCombatClient.scene("world_combat:move_auroraveil/field", 1, function (frame) {
    const entry: CombatSceneEntry<{ radius: number; ceiling: number; ribbons: number; low: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const radius = Math.max(0.6, Number(entry.data.radius) || 4);
    const ceiling = Math.max(0.6, Number(entry.data.ceiling) || 5);
    const center = entry.position, cx = center[0], base = center[1], cz = center[2];
    const now = frame.serverTick();
    const pulse = 0.34 + 0.14 * Math.sin(now * 0.08);
    frame.ring(cx, base + 0.06, cz, radius, auroraVeilShade(0x7FE6D8, pulse));
    const ribbons = Math.max(3, Math.min(24, Math.round(Number(entry.data.ribbons) || 8)));
    const bands = ribbons >= 16 ? 4 : ribbons >= 9 ? 3 : 2;
    const top = base + 0.35 + Math.max(0, ceiling - 0.6);
    for (let i = 0; i < bands; i++) {
        const y = base + 0.35 + (top - base - 0.35) * (i + 0.7) / (bands + 0.4);
        const drift = now * 0.006 + i * 1.7;
        const lateral = (i - (bands - 1) / 2) * 0.16 * radius;
        const chord = Math.sqrt(Math.max(0, radius * radius - lateral * lateral));
        const dx = Math.cos(drift), dz = Math.sin(drift), nx = -dz, nz = dx;
        const mx = cx + nx * lateral, mz = cz + nz * lateral;
        const shimmer = 0.34 + 0.18 * Math.sin(now * 0.11 + i * 2.1);
        frame.line(mx - dx * chord, y, mz - dz * chord, mx + dx * chord, y, mz + dz * chord,
            auroraVeilShade(i % 2 === 0 ? 0x9FE8DF : 0xB79CF0, shimmer));
    }
});
