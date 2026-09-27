/**
 * 尖石攻击 / stoneedge 的客户端表现。
 *
 * 一句话：脚下先裂开一道缝、土尘沿真实地表窜出去 → 石刺在缝上一段段从地里升起再回落、崩落碎石 → 站在脊带里的人
 *   被从下方刺中、溅起岩屑与冷白火花 → 没刺到就只剩一道朝外散开的尘环；裂痕按真实触地点留在地上。
 * 色相家族：石灰（0x9A8F82 主体、0xC9C2B6 亮面、0x5C554E 暗部）＋冷白高光（0xF4F1EA）只出现在刺尖与命中。
 * 拍子：起 sunder（裂土）→ 裂 spike（每段真实地表顶起短尖石）→ 刺 pierce（扎中）→ 收 miss（空裂）。
 * 主体在自定义场景 move_stoneedge_spike：服务端每段发与判定共用的真实地表顶点 `data.path`，客户端沿这些点画
 *   明确立起的短尖石，按 `data.start`／`data.duration` 升起再回落；不再随机撒细 spike sprite。
 * 裂痕在自定义场景 move_stoneedge_crack：把同一组真实触地点画成地面裂线，随 `scarTicks` 自然消退，不替换任何方块。
 * 粒子层（earth／large_rock）沿同一组 `data.path` 只做尘与碎屑；数：碎石量绑定 `data.dust`（物攻与体重换算），
 *   段数绑定 `data.segments`（等级换算），尺度绑定 `data.scale`（裂线长度换算），亮度绑定 `data.intensity`（石刺威力换算）。
 */
const StoneEdgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sunder: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.14], spread: 12,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0x9A8F82, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x5C554E, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spike: {
            duration: 14,
            exit: { stop: 10, drain: 10 },
            emitters: [
                {
                    name: "ridge", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    direction: "up", speed: [0.04, 0.16], spread: 24,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0x7C7268, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shards", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    direction: "up", speed: [0.08, 0.3], spread: 30, spin: 12,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [12, 22], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x9A8F82, alpha: [0.9, 0], light: "world", maxParticles: 120
                }
            ]
        },
        pierce: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "stab", bind: "target", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [7, 13], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xC9C2B6, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.08, 0.28], spread: 30, spin: 14,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x9A8F82, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.07, 0.01],
                    color: 0xF4F1EA, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2], spread: 16,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 17], size: [0.07, 0.02],
                    color: 0x7C7268, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stoneedge", 1, StoneEdgeDefinition);

/** 尖石攻击：逐段真实地表上的短尖石升起/回落；顶点与判定共用服务端 `data.path`。 */
function stoneedgeFinite(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function stoneedgeClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function stoneedgeColour(alpha: number, rgb: number): number { return ((Math.round(255 * stoneedgeClamp(alpha, 0, 1)) << 24) | rgb) | 0; }
function stoneedgePoint(value: any): number[] | null {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); })
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : null;
}

WorldCombatClient.scene("world_combat:move_stoneedge_spike", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ path?: number[][]; half?: number; rise?: number; dust?: number; scale?: number;
        intensity?: number; direction?: number[]; start?: number; duration?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data || data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 1) return;
    const start = stoneedgeFinite(data.start, frame.serverTick());
    const duration = Math.max(1, stoneedgeFinite(data.duration, 14));
    const progress = stoneedgeClamp((frame.serverTick() - start) / duration, 0, 1);
    // 升起在前段，随后回落：尖石短暂立起再被地面收回。
    const grow = progress < 0.35 ? progress / 0.35 : Math.max(0, 1 - (progress - 0.35) / 0.65);
    const full = stoneedgeFinite(data.rise, 1);
    const height = full * grow;
    const half = Math.max(0.2, stoneedgeFinite(data.half, 0.5));
    const scale = stoneedgeClamp(stoneedgeFinite(data.scale, 1), 0.4, 2.4);
    const direction = stoneedgePoint(data.direction) || [0, 0, 1];
    const flat = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]) || 1;
    const sx = -direction[2] / flat, sz = direction[0] / flat;
    const alpha = stoneedgeClamp(0.3 + 0.7 * grow, 0, 1);
    const frameIndex = Math.round(stoneedgeClamp(stoneedgeFinite(data.intensity, 1), 0.4, 2.2) * 2) % 6;
    for (let i = 0; i < path.length; i++) {
        const p = path[i];
        for (let s = -1; s <= 1; s += 1) {
            if (s !== 0 && i % 2 !== 0) continue;
            const off = s === 0 ? 0 : s * half * 0.7;
            const x = p[0] + sx * off, z = p[2] + sz * off;
            const y = p[1] + Math.max(0, height) * 0.4;
            frame.sprite("cobblemon:particle/generic/spike", x, y, z, Math.max(0.12, height * 0.9 * scale),
                0, stoneedgeColour(0.95 * alpha, s === 0 ? 0xC9C2B6 : 0x9A8F82), frameIndex, false);
        }
        if (i % 2 === 0) {
            const puffs = stoneedgeClamp(Math.round(stoneedgeFinite(data.dust, 12) / 8), 1, 4);
            for (let d = 0; d < puffs; d++) {
                const a = d * 2.4 + i;
                frame.sprite("cobblemon:particle/generic/tinydust", p[0] + Math.cos(a) * 0.24, p[1] + 0.08 + 0.12 * grow,
                    p[2] + Math.sin(a) * 0.24, 0.07 + 0.03 * scale, 0, stoneedgeColour(0.5 * alpha, 0x7C7268), 0, false);
            }
        }
    }
});

/** 尖石攻击的地面裂痕：只按真实触地点画线，随 scarTicks 消退，不改动任何方块。 */
WorldCombatClient.scene("world_combat:move_stoneedge_crack", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ path?: number[][]; half?: number; scale?: number; start?: number;
        duration?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data || data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 1) return;
    const start = stoneedgeFinite(data.start, frame.serverTick());
    const duration = Math.max(1, stoneedgeFinite(data.duration, 90));
    const age = Math.max(0, frame.serverTick() - start);
    const fade = stoneedgeClamp(1 - Math.max(0, age - duration * 0.6) / (duration * 0.4), 0, 1);
    const half = Math.max(0.2, stoneedgeFinite(data.half, 0.5));
    const scale = stoneedgeClamp(stoneedgeFinite(data.scale, 1), 0.4, 2.4);
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        frame.line(a[0], a[1] + 0.03, a[2], b[0], b[1] + 0.03, b[2], stoneedgeColour(0.8 * fade, 0x5C554E));
        // 边缘各带一条短裂支，宽度与脊带半宽一致。
        const dx = b[0] - a[0], dz = b[2] - a[2];
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const nx = -dz / len, nz = dx / len;
        frame.line(a[0] + nx * half * 0.5, a[1] + 0.02, a[2] + nz * half * 0.5,
            b[0] + nx * half * (0.4 + 0.3 * scale), b[1] + 0.02, b[2] + nz * half * (0.4 + 0.3 * scale),
            stoneedgeColour(0.55 * fade, 0x7C7268));
        frame.line(a[0] - nx * half * 0.5, a[1] + 0.02, a[2] - nz * half * 0.5,
            b[0] - nx * half * (0.4 + 0.25 * scale), b[1] + 0.02, b[2] - nz * half * (0.4 + 0.25 * scale),
            stoneedgeColour(0.55 * fade, 0x7C7268));
    }
});
