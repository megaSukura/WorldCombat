/**
 * 劈瓦 / brickbreak 的客户端表现。
 *
 * 一句话：抬臂聚起一线暖光后一步劈下，身前走廊被刀风扫过，手刀沿真实落点逐段落下，落刀处亮起火花；
 * 被实际清除的屏障各自炸成冷蓝碎片。
 * 色相家族：砖瓦赭与近白（刀风与火花）为底，屏障碎片用一处冷蓝——「屏障碎了」是这招的第二个含义。
 * 拍子：起（windup 聚光）→ 扫（sweep 走廊）→ 劈（chop 手刀逐段下落与落点火花）→ 碎（break 冷蓝碎片）→ 空（miss）。
 * 范围：sweep 用 path 画出服务端走廊判定的同一组四个顶点；chop 的手刀用自定义场景沿同一组竖直端点逐段下落。
 * 数：`data.notes`（劈斩威力换算）绑定落点火花量，`data.shards`（按实际清除层数换算）绑定碎片量，
 * `data.scale`（碎壁半径 / 8）放大碎片散开的范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BrickbreakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xE8B0A0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x8A6A50, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sweep: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: 26, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.22, 0.05],
                    color: 0xE8C0A0, alpha: [0.22, 0], light: "full", maxParticles: 80
                }
            ]
        },
        chop: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0D8C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        break: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shatter", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "shards", fallback: 10 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 28,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFD8F0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 100
                },
                {
                    name: "frost", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xDCEFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9A8A7A, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_brickbreak", 1, BrickbreakDefinition);

/**
 * 手刀主体：服务端只发一次，带上落刀的三点竖直刀痕、起始刻与时长；客户端按 serverTick 让刀锋自上而下沿
 *   这条轨迹逐段下落，读得出「一刀劈下来」，而不是命中后整条竖纹同时亮起。固定若干段刀锋 sprite 与当前
 *   子段的连线，无粒子生灭或额外实体。
 */
const BrickbreakEdge = "cobblemon:particle/generic/cut";
function brickbreakNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }

WorldCombatClient.scene("world_combat:move_brickbreak_chop", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path: number[][] = Array.isArray(data.path) ? data.path : [];
    if (path.length < 2) return;
    const start = brickbreakNumber(data.start, frame.serverTick());
    const duration = Math.max(1, brickbreakNumber(data.duration, 5));
    const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const scale = Math.max(0.6, Math.min(1.6, brickbreakNumber(data.scale, 1)));
    // Cumulative arc length so the blade travels at a steady rate down the authored cut.
    let total = 0;
    for (let i = 1; i < path.length; i++) {
        const dx = path[i][0] - path[i - 1][0], dy = path[i][1] - path[i - 1][1], dz = path[i][2] - path[i - 1][2];
        total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (!(total > 0)) return;
    function at(t: number): number[] {
        let remaining = total * Math.max(0, Math.min(1, t));
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (remaining <= length || i === path.length - 1) {
                const f = length > 1e-6 ? remaining / length : 0;
                return [a[0] + dx * f, a[1] + dy * f, a[2] + dz * f];
            }
            remaining -= length;
        }
        return path[path.length - 1];
    }
    const head = at(progress);
    const fade = progress >= 1 ? 0.0 : 1 - progress * 0.2;
    const rgb = 0xF4E0C8;
    const alpha = Math.round(0.9 * fade * 255);
    frame.sprite(BrickbreakEdge, head[0], head[1], head[2], (0.3 + 0.16 * scale) * (1 + 0.2 * (1 - progress)), 0,
        (alpha << 24 | rgb) | 0, Math.floor(frame.serverTick() * 0.6) % 7, true);
    // The just-cut subsegment: a short bright line from slightly behind the head to the head.
    const tail = at(Math.max(0, progress - 0.18));
    frame.line(tail[0], tail[1], tail[2], head[0], head[1], head[2], (Math.round(0.7 * fade * 255) << 24 | 0xF0D8C0) | 0);
});
