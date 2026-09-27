/**
 * 抓狂 / flail 的客户端表现。
 *
 * 一句话：人一沉身，身前由身体前部甩出一条短横挥，扫过服务端判定的同一片扇面；命中处崩出尘与缺血红雾。
 * 血越少，扫出的动作越急、红雾越浓。
 * 色相家族：暖骨白与沙棕（tinydust / speedlines / impact_normal）为主体，唯一的饱和色是缺血红
 * （fire/ember 的暖橙红，只在 swipe 的 rage 与 hit 的 rage 层小面积出现），它正好是「还剩多少血」的读数。
 * 拍子：起（windup 沉身，`data.windup` 跟随真实 prepare）→ 乱（每拍一条从身前扫出的短横挥）→ 中（hit 命中崩屑）。
 * 主体在自定义场景 move_flail_swipe：服务端每拍发同一条 `data.path`（与 WorldGeometry.sector 判定共用的扇面端点）、
 *   身体前部起点 `data.front` 与 `data.start`／`data.duration`，客户端逐帧画当前扫到的那一小段弧与挥臂。
 *   每拍更新同一个 key，上一拍的挥臂随即收住，不再留下叠成长寿命的整片扇面。
 * 数：挥臂与迸溅密度绑定 `data.sparks`（物攻与缺失血量派生），缺血红绑定 `data.rage`（缺失血量派生），
 *   命中亮度绑定 `data.intensity`（单发威力派生）——画面里的数与机制里的数一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FlailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.08, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.06, 0.02],
                    color: 0xD8C39A, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "rage_seed", bind: "source", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "moves", fallback: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8704A, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "knuckle", bind: "target", offset: [0, 0.1, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.24], spread: 22,
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF3DC, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.06, 0.02],
                    color: 0xCFA46E, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "rage_spatter", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "rage", fallback: 2 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0xE8704A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flail", 1, FlailDefinition);

/** 抓狂每拍的短横挥：沿服务端扇面顶点画当前扫过的一小段弧，端点与判定共用；起点在身体前部。 */
function flailFinite(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function flailClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function flailColour(alpha: number, rgb: number): number { return ((Math.round(255 * flailClamp(alpha, 0, 1)) << 24) | rgb) | 0; }

WorldCombatClient.scene("world_combat:move_flail_swipe", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ path?: number[][]; front?: number[]; start?: number; duration?: number;
        sparks?: number; rage?: number; intensity?: number; miss?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data || data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 3) return;
    const arc = path.slice(1);
    const start = flailFinite(data.start, frame.serverTick());
    const duration = Math.max(1, flailFinite(data.duration, 6));
    const progress = flailClamp((frame.serverTick() - start) / duration, 0, 1);
    const intensity = flailClamp(flailFinite(data.intensity, 1), 0.4, 2.4);
    const miss = data.miss === 1;
    const fade = miss ? 0.4 : 1;
    const front = Array.isArray(data.front) && data.front.length === 3 ? data.front : path[0];
    // 当前扫到的位置：把整个扇弧按进度走一遍，只画头部与身后一小段。
    const at = progress * (arc.length - 1);
    const head = flailClamp(Math.floor(at), 0, arc.length - 1);
    const tip = arc[head];
    frame.line(front[0], front[1], front[2], tip[0], tip[1], tip[2], flailColour(0.85 * fade, 0xE8D8B4));
    const tail = Math.max(0, head - 3);
    for (let i = tail; i < head; i++) {
        const keep = 1 - (head - i) / 4;
        frame.line(arc[i][0], arc[i][1], arc[i][2], arc[i + 1][0], arc[i + 1][1], arc[i + 1][2],
            flailColour(0.7 * keep * fade, 0xF2E6CE));
    }
    const dust = flailClamp(Math.round(flailFinite(data.sparks, 8) / 2), 2, 14);
    for (let s = 0; s < dust; s++) {
        const a = s * 2.39996 + progress * 6.0, r = 0.08 + 0.22 * (s / dust);
        frame.sprite("cobblemon:particle/generic/tinydust",
            tip[0] + Math.cos(a) * r, tip[1] + 0.05 + Math.sin(a * 1.7) * 0.1, tip[2] + Math.sin(a) * r,
            0.06 + 0.02 * intensity, 0, flailColour(0.45 * fade, 0xD8C39A), 0, false);
    }
    // 缺血红只贴在扫过的尖端，面积很小，正好是「还剩多少血」的读数。
    const rage = flailClamp(Math.round(flailFinite(data.rage, 0) / 12), 0, 4);
    for (let e = 0; e < rage; e++) {
        const a = e * 2.1 + progress * 9.0, r = 0.06 + 0.16 * (e / Math.max(1, rage));
        frame.sprite("cobblemon:particle/generic/fire/ember",
            tip[0] + Math.cos(a) * r, tip[1] + 0.1 + Math.sin(a * 1.3) * 0.08, tip[2] + Math.sin(a) * r,
            0.06, 0, flailColour(0.6 * fade, 0xE8704A), 0, true);
    }
    frame.sprite("cobblemon:particle/generic/sparkle/smallsparkle", tip[0], tip[1], tip[2],
        0.1 + 0.05 * intensity, 0, flailColour(0.7 * fade, 0xFFF3DC), 0, true);
});
