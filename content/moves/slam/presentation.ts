/**
 * 摔打 / slam 的客户端表现。
 *
 * 一句话：长肢高举过头的起手 → 地面上亮起一道窄长长条、标出落痕（它就是判定范围，缩到落下的那一刻）→
 * 长肢从高处朝真实落点推进、沿地面犁出已扫过的痕迹 → 重砸落下，长条上一柱钝白尘沿整条扬起、泥土沿条带外扑，
 * 命中处碎石外抛；条带上没人就只留一道尘痕。
 * 色相家族：暖土棕（earth／tinydust）为主，钝白（impact_normal）只出现在重砸核心；单一色相，无饱和色。
 * 拍子：起 raise（自定义场景画真实肢身扬起）→ 标 mark（地面长条，等待落下）→ 扫 swing（每刻上传真实肢端与
 *   已犁过的地面段）→ 砸 impact（核心爆发 + 整条扬尘）→ 击 hit（碎石）/ 空 whiff。
 * 范围：mark／impact／whiff 的 polygon 沿 `data.path`（服务端贴地取样出的落痕顶点）铺满，那道长条就是会被砸到的
 *   区域；polyline 勾出同一条落痕的边。`data.width` 让核心尘柱随落痕宽度收放。
 * 运动：起手尘土向上收；swing 的肢端从高处朝落点推进，判定与表现共用 `data.from`/`data.tip` 与 `data.path`。
 * 数：扬尘数量绑 `data.dust`（体重派生），强度绑 `data.intensity`（本击威力 / 90），砸落等待绑 `data.fall`。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const SlamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.48, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 70
                },
                {
                    name: "taut", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 16, shape: { kind: "box", size: [0.3, 0.8, 0.3] },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [3, 7], size: [0.14, 0.03],
                    color: 0xEADDC0, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 8 },
            emitters: [
                {
                    name: "scar_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    rate: 28, shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xF0E6CE, alpha: [0.5, 0], light: "full", maxParticles: 110
                },
                {
                    name: "scar_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "polygon" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xC7A97B, alpha: [0.22, 0], light: "world", maxParticles: 130
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "dust", fallback: 20 }, at: 1 },
                    shape: { kind: "cylinder", radius: { data: "width", fallback: 1.0 }, length: 1.6 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "soil", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 20 } },
                    shape: { kind: "polygon" },
                    direction: "up", speed: [0.08, 0.32], spread: 20,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shock_crest", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.1, 0.34], spread: 8,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xC7A97B, alpha: [0.6, 0], light: "world", maxParticles: 130
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 24,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE8DCC0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.65, 0], light: "world", maxParticles: 90
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "empty", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14 },
                    shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC7A97B, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_slam", 1, SlamDefinition);

/**
 * 长肢的真实肢身：起手时从身前低处扬到头顶，落下时从高处推进到真实落点，并把已犁过的地面段画成渐隐细线。
 * 服务端每刻上传终点的真实坐标；客户端只按当前坐标作画，没有粒子生灭也没有额外实体。固定数量的线段与贴图。
 */
const SlamArcLine = "cobblemon:particle/generic/speedlines";
const SlamArcTip = "cobblemon:particle/generic/impact/impact_normal";
const SlamArcDust = "cobblemon:particle/generic/earth";

function slamArcNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function slamArcVec(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function slamArcPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) { const point = slamArcVec(value[i], null); if (point) points.push(point); }
    return points;
}

WorldCombatClient.scene("world_combat:move_slam_arc", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const moment = String(data.moment || "");
    const scale = Math.max(0.5, Math.min(2.4, slamArcNumber(data.scale, 1)));
    const intensity = Math.max(0.4, Math.min(2.6, slamArcNumber(data.intensity, 1)));
    const heavy = slamArcNumber(data.heavy, 0) > 0;

    if (moment === "raise") {
        let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
        const anchor = JSON.parse(frame.anchor(entry.source));
        if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.6, anchor.height); }
        const start = slamArcNumber(data.start, frame.serverTick());
        const windup = Math.max(1, slamArcNumber(data.windup, 11));
        if (frame.serverTick() > start + windup + 2) return;
        const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / windup));
        const direction = slamArcVec(data.direction, [0, 0, 1])!;
        const reach = Math.max(0.9, height * 0.9);
        const baseX = x + direction[0] * reach * 0.3, baseY = y + 0.4, baseZ = z + direction[2] * reach * 0.3;
        const upX = x - direction[0] * 0.25, upY = y + height + 0.9, upZ = z - direction[2] * 0.25;
        const tipX = baseX + (upX - baseX) * t, tipY = baseY + (upY - baseY) * t, tipZ = baseZ + (upZ - baseZ) * t;
        frame.line(x, y + 0.5, z, tipX, tipY, tipZ, 0xE6C7A97B | 0);
        frame.line(baseX, baseY, baseZ, tipX, tipY, tipZ, 0xB08C7448 | 0);
        frame.sprite(SlamArcLine, tipX, tipY, tipZ, (0.2 + 0.06 * t) * scale, 0, 0xFFF0E6CE | 0, Math.floor(t * 2) % 3, true);
    } else if (moment === "swing") {
        const from = slamArcVec(data.from, null);
        const tip = slamArcVec(data.tip, [entry.position[0], entry.position[1] + 0.2, entry.position[2]]);
        if (from && tip) {
            const dx = tip[0] - from[0], dy = tip[1] - from[1], dz = tip[2] - from[2];
            const flat = Math.sqrt(dx * dx + dz * dz) || 1;
            const sx = -dz / flat * 0.07 * scale, sz = dx / flat * 0.07 * scale;
            for (let i = -1; i <= 1; i++) {
                frame.line(from[0] + sx * i, from[1], from[2] + sz * i, tip[0] + sx * i, tip[1], tip[2] + sz * i,
                    ((i === 0 ? 230 : 120) << 24 | (heavy ? 0x8C7448 : 0xC7A97B)) | 0);
            }
        }
        const path = slamArcPoints(data.path);
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            frame.line(a[0], a[1] + 0.05, a[2], b[0], b[1] + 0.05, b[2], (Math.round(150 * (i / path.length)) << 24 | 0xC7A97B) | 0);
        }
        if (tip) {
            frame.sprite(SlamArcTip, tip[0], tip[1] + 0.08, tip[2], (0.24 + 0.16 * intensity) * scale, 0, 0xFFFFF2D8 | 0, 1, true);
            frame.sprite(SlamArcDust, tip[0], tip[1] + 0.02, tip[2], (0.3 + 0.1 * intensity) * scale, 0, 0xFF8C7448 | 0, 0, false);
        }
    }
});
