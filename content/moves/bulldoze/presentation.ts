/**
 * 重踏 / bulldoze 的客户端表现。
 *
 * 一句话：施法者抬脚、脚边卷起石屑，重踏落地后一圈地裂贴着**真实地表**向外推开，经过的每一处都激起尘土与
 *   碎石，全部落定后沿同一条地表路径留下一道薄裂缝再散去；地面方块本身不会被替换。
 * 色相家族：土黄与石灰（earth / large_rock / tinydust / groundquake）为主体，近白只做重踏那一下的高光。
 * 拍子：起（stomp 抬脚聚屑）→ 击（slam 落地、wave 地裂推进、hit 逐处溅屑、slow 被压速）→ 收（crack 余痕 / miss 落空）。
 * 范围与路径：wave 的环由服务端每刻给出当前真实外沿的多边形 `data.path`（沿可连接地表采样），判定与表现共用同一组
 *   地表顶点；推进到哪就画到哪，墙、断口与另一楼层处自然停住。
 * 运动：地裂从脚下沿地表一圈圈向外推，`data.radius` 是当前外沿，`data.inner` 是本圈内沿。
 * 数：`data.flow`（半径派生）决定环上密度，`data.count`（威力派生）决定落点碎屑量，`data.marks` 决定重踏高光。
 * 余痕（crack）用下面的自定义场景沿服务端走出的真实地表路径 `data.paths` 逐帧画线，按 `data.life` 淡出——
 *   不生成粒子或实体；同一组顶点也是判定用的路径。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BulldozeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stomp: {
            duration: 14,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.06, 0], height: -0.5,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: -0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 44
                }
            ]
        },
        slam: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8DFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "clods", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "marks", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "marks", fallback: 14 }, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        wave: {
            duration: 26,
            exit: { drain: 16 },
            emitters: [
                {
                    name: "front", bind: "path", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "flow", fallback: 70 },
                    shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.1], spread: 8,
                    lifetime: [10, 16], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.75, 0], light: "world", maxParticles: 180
                },
                {
                    name: "spray", bind: "path", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 50 },
                    shape: { kind: "polyline" },
                    direction: "up", speed: [0.05, 0.18], spread: 16,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 240
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.26], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "clods", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.34], spread: 30,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slow: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "sink", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.04, 0.14], spread: 20,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bulldoze", 1, BulldozeDefinition);

function bulldozeNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function bulldozeTriple(value: any): number[] | null {
    return Array.isArray(value) && value.length >= 3 && (value as any[]).slice(0, 3).every(function (n) { return typeof n === "number" && isFinite(n); })
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : null;
}

/**
 * 重踏地裂的推进前沿与余痕：服务端每刻发同一组真实地表路径 `data.paths`（沿可连接地表采样的有序顶点），
 * wave 阶段逐段画当前外沿、scar 阶段整条淡出。判定与表现共用这组顶点，固定数量图形，无粒子与实体开销。
 */
WorldCombatClient.scene("world_combat:bulldoze_front", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const paths = data.paths;
    if (!Array.isArray(paths)) return;
    const now = frame.serverTick();
    const scar = data.moment === "scar";
    const life = scar ? Math.max(1, bulldozeNumber(data.life, 1)) : 0;
    let fade = 1;
    if (scar) {
        fade = Math.max(0, 1 - (now - bulldozeNumber(data.start, now)) / life);
        if (fade <= 0) return;
    }
    const marks = Math.max(0, Math.min(48, Math.round(bulldozeNumber(data.marks, 0))));
    const dark = ((Math.round((scar ? 0.72 : 0.55) * fade * 255) << 24) | 0x2E2015) | 0;
    const warm = ((Math.round((scar ? 0.4 : 0.5) * fade * 255) << 24) | 0x8C6A44) | 0;
    const head = ((Math.round(0.9 * fade * 255) << 24) | 0xE8DFC8) | 0;
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        if (!Array.isArray(path)) continue;
        for (let j = 1; j < path.length; j++) {
            const a = bulldozeTriple(path[j - 1]), b = bulldozeTriple(path[j]);
            if (a === null || b === null) continue;
            frame.line(a[0], a[1], a[2], b[0], b[1], b[2], dark);
            frame.line(a[0], a[1] + 0.035, a[2], b[0], b[1] + 0.035, b[2], warm);
        }
        if (!scar && path.length > 0) {
            const p = bulldozeTriple(path[path.length - 1]);
            if (p !== null) frame.sprite("cobblemon:particle/generic/ring/groundquake", p[0], p[1] + 0.06, p[2], 0.55, 0, head, 0, false);
        }
    }
    // 余痕碎屑：固定数量，按 marks 沿已走出的路径补几粒高光，不生成粒子。
    if (scar) {
        const total = Math.min(48, marks);
        for (let k = 0; k < total; k++) {
            const path = paths[k % paths.length];
            if (!Array.isArray(path) || path.length === 0) continue;
            const p = bulldozeTriple(path[Math.floor((k * 7) % path.length)]);
            if (p === null) continue;
            frame.sprite("cobblemon:particle/generic/earth", p[0], p[1] + 0.05, p[2], 0.14, 0, warm, k % 4, false);
        }
    }
});
