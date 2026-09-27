/**
 * 迷昏拳 / dizzypunch 的客户端表现。
 *
 * 一句话：按节拍左右交替，一拍一只拳影从身体一侧递到可达接触面；挨打的人身上迸出一记短促亮闪，
 * 整串打完时头顶才转起单独的鸟形回执。
 * 色相家族：暖黄（0xE8B24F）与近白（0xFFF0D0）；饱和只出现在拳影与命中闪的小面积。
 * 拍子：起 shuffle（踏节拍）→ 打 punch（双拳预备）与 fist（一拍一只拳影）→ 中 hit（受击闪）→ 收 daze／linger（鸟形混乱存续）。
 * 主体在自定义场景 move_dizzypunch_fist：服务端每拍发同一方向、`data.side`、`data.contact`（可达接触面）与
 *   `data.right`（局部右轴）；同一 key 持续更新，因此一拍一拳、左右可辨，而不是整片扇面同时开花。
 * 运动：拳影由侧位沿 `data.direction` 递到 `data.contact`；命中的目标向外迸出拳击与一记小星星闪。
 * 数：命中闪数量绑定 `data.hitStars`（拳数派生，做小闪）；`data.beat`／`data.beats` 让每一拍的进度都能从画面读出。
 */
const DizzypunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        shuffle: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "bob", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.22, 0.06],
                    color: 0xFFF0D0, alpha: [0.6, 0], light: "full", maxParticles: 24
                },
                {
                    name: "taps", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xD8C08A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        punch: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ready", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 4, interval: 4, repeats: { data: "beats", fallback: 3 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [6, 11], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.05, 0.2], spread: 20,
                    lifetime: [6, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "flash", bind: "target", height: 1.08,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "hitStars", fallback: 3 }, interval: 2 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xE8B24F, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        daze: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "birds", bind: "target", height: 1.12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.2, 0.05],
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xD8C08A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fumble: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "self", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [9, 15], size: [0.16, 0.04],
                    color: 0xE8B24F, alpha: [0.65, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "birds", bind: "target", height: 1.16,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [14, 22], size: [0.16, 0.03],
                    color: 0xFFF0D0, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dizzypunch", 1, DizzypunchDefinition);

/** 每拍一只拳影的主体：由服务端给的 side／contact／方向／右轴逐帧绘制，一拍一拳、左右可辨。 */
function dizzypunchNum(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function dizzypunchClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function dizzypunchArgb(alpha: number, rgb: number): number { return ((Math.round(255 * dizzypunchClamp(alpha, 0, 1)) << 24) | rgb) | 0; }
function dizzypunchVec(value: any, fallback: number[]): number[] {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); })
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : fallback;
}

WorldCombatClient.scene("world_combat:move_dizzypunch_fist", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; side?: number; contact?: number; reach?: number; arc?: number;
        direction?: number[]; right?: number[]; beat?: number; beats?: number; start?: number; duration?: number;
        scale?: number; intensity?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data || data.lifecycle) return;
    const origin = entry.position;
    const raw = dizzypunchVec(data.direction, [0, 0, 1]);
    const flat = Math.sqrt(raw[0] * raw[0] + raw[2] * raw[2]) || 1;
    const ux = raw[0] / flat, uz = raw[2] / flat;
    const right = dizzypunchVec(data.right, [-uz, 0, ux]);
    const side = data.side === -1 ? -1 : 1;
    const reach = dizzypunchClamp(dizzypunchNum(data.reach, 2.2), 0.3, 4);
    const contact = dizzypunchClamp(dizzypunchNum(data.contact, reach), 0.2, reach);
    const start = dizzypunchNum(data.start, frame.serverTick());
    const duration = Math.max(1, dizzypunchNum(data.duration, 8));
    const progress = dizzypunchClamp((frame.serverTick() - start) / duration, 0, 1);
    const intensity = dizzypunchClamp(dizzypunchNum(data.intensity, 1), 0.4, 2.4);
    const fade = 1 - progress * 0.3;
    const height = 0.05;
    // 起点在身体局部一侧，终点在可达接触面；一拳从侧位递向前方。
    const sx = origin[0] + right[0] * side * 0.45, sy = origin[1] + height, sz = origin[2] + right[2] * side * 0.45;
    const ex = origin[0] + ux * contact, ey = origin[1] + height, ez = origin[2] + uz * contact;
    const ease = progress * progress * (3 - 2 * progress);
    const fx = sx + (ex - sx) * ease, fy = sy + (ey - sy) * ease, fz = sz + (ez - sz) * ease;
    // 这一拍扫过的短弧：按进度画当前真实子段。
    const tail = 0.4, begin = Math.max(0, progress - tail);
    let px = 0, py = 0, pz = 0, started = false;
    for (let k = 0; k <= 6; k++) {
        const t = begin + (progress - begin) * k / 6, e = t * t * (3 - 2 * t);
        const x = sx + (ex - sx) * e, y = sy + (ey - sy) * e, z = sz + (ez - sz) * e;
        if (started) frame.line(px, py, pz, x, y, z, dizzypunchArgb(0.45 * fade, 0xE8B24F));
        px = x; py = y; pz = z; started = true;
    }
    frame.sprite("cobblemon:particle/generic/fist", fx, fy, fz, 0.34 + 0.06 * intensity, side * 24,
        dizzypunchArgb(0.95, 0xFFF0D0), 0, true);
    if (progress > 0.7 && contact > 0.3) {
        frame.sprite("cobblemon:particle/generic/impact/impact_fighting", ex, ey + 0.02, ez, 0.2 + 0.05 * intensity, 0,
            dizzypunchArgb(0.8 * fade, 0xFFFFFF), 0, true);
    }
});
