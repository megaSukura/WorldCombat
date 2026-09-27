/**
 * 强力鞭打 / powerwhip 的客户端表现。
 *
 * 一句话：青藤先自脚边一圈圈盘起 → 鞭尖从身前顺次扫过长弧或整圈，一条粗细连贯的藤身追着鞭尖走，
 *   叶屑只做拖尾 → 扫中处炸开草绿冲击、被扫中的人被推开；一段都没扫到才散叶收尾。
 * 色相家族：草绿（0x6FA83C 主体、0x9BD05A 细节）与米白鞭梢为主；冲击层用草绿钝击色，无第二个色相。
 * 拍子：起 coil（盘藤，自定义场景画真实缠起的圈）→ 扫 sweep（逐段上传当前鞭身与扫过轨迹，判定与表现共用端点）
 *   → 击 hit（命中草绿钝击）／空 miss（扫空散叶）。
 * 运动：鞭尖按服务端每刻真实的两端点推进，藤身由固定数量的叶片贴图从 pivot 连到鞭尖；扫过轨迹画成渐隐细线。
 * 数：藤身粗细与鞭梢亮度读 `data.intensity`（本击威力 / 120）、藤段长度读 `data.reach`；
 *     画面里的范围与强度都与机制一致，叶片拖尾数保留在单元内部。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PowerWhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hit: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "blunt", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 13, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.09, 0.28],
                    lifetime: [5, 10], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xE6F7B0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf_white",
                    burst: { count: { data: "leaves", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.07, 0.24],
                    spread: 40, spin: 14,
                    lifetime: [7, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xCFE98A, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "wake", bind: "target", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0x5C8F34, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "leaves", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0x6FA83C, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powerwhip", 1, PowerWhipDefinition);

const PowerWhipVine = "cobblemon:particle/generic/grass/leaf";
const PowerWhipTip = "cobblemon:particle/generic/grass/razorleaf";
const PowerWhipLeaf = "cobblemon:particle/generic/grass/razorleaf_white";
const PowerWhipCoil = "cobblemon:particle/generic/grass/smallleaf";

function powerwhipNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function powerwhipPoint(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function powerwhipPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const point = powerwhipPoint(value[i], null);
        if (point) points.push(point);
    }
    return points;
}

/**
 * 逐段扫过的藤身：轨迹画成渐隐细线，当前藤身用固定数量的叶片贴图从 pivot 连到真实鞭尖，
 * 鞭梢与拖尾叶读本次强度。服务端每刻只上传当前真实子段的端点，画面不另存第二份几何。
 */
WorldCombatClient.scene("world_combat:move_powerwhip_vine", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const frontier = powerwhipPoints(data.path);
    const tip = powerwhipPoint(data.tip, null);
    const scale = Math.max(0.5, powerwhipNumber(data.scale, 1));
    const intensity = Math.max(0.4, Math.min(2.6, powerwhipNumber(data.intensity, 1)));
    const progress = Math.max(0, Math.min(1, powerwhipNumber(data.progress, 0)));
    for (let i = 1; i < frontier.length; i++) {
        const a = frontier[i - 1], b = frontier[i];
        const alpha = Math.round(150 * (i / Math.max(1, frontier.length - 1)));
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], (alpha << 24 | 0x6FA83C) | 0);
    }
    if (frontier.length > 0 && tip !== null) {
        const pivot = frontier[0], beads = 14;
        for (let i = 0; i < beads; i++) {
            const t = (i + 1) / beads;
            const x = pivot[0] + (tip[0] - pivot[0]) * t;
            const y = pivot[1] + (tip[1] - pivot[1]) * t + Math.sin(t * Math.PI) * 0.12;
            const z = pivot[2] + (tip[2] - pivot[2]) * t;
            const size = (0.16 + 0.22 * (1 - t)) * scale * (0.85 + 0.28 * intensity);
            frame.sprite(PowerWhipVine, x, y, z, size, 0, 0xFF6FA83C | 0, i % 4, true);
        }
    }
    if (tip !== null) {
        frame.sprite(PowerWhipTip, tip[0], tip[1], tip[2], (0.3 + 0.16 * intensity) * scale, 0, 0xFFEAF6C8 | 0, 3, true);
        for (let i = 0; i < 4; i++) {
            const angle = i * 1.7 + progress * 6.0;
            frame.sprite(PowerWhipLeaf, tip[0] + Math.cos(angle) * 0.3, tip[1] - 0.05 - i * 0.04, tip[2] + Math.sin(angle) * 0.3,
                0.14, angle * 40, 0xCC9BD05A | 0, i % 7, false);
        }
    }
});

/**
 * 起手盘藤：服务端只发一次，带上真实朝向与起手长度；客户端按 serverTick 让几圈藤自脚边一圈圈盘起，
 * 读得出「先把藤盘起来」而不是起点撒一把叶。固定三圈、每圈八片，无粒子生灭或额外实体。
 */
WorldCombatClient.scene("world_combat:move_powerwhip_coil", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.5, anchor.height); }
    const start = powerwhipNumber(data.start, frame.serverTick());
    const windup = Math.max(1, powerwhipNumber(data.windup, 14));
    if (frame.serverTick() > start + windup + 2) return;
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / windup));
    const coils = 3, perCoil = 8, grown = Math.min(1, t * 1.25);
    for (let c = 0; c < coils; c++) {
        const appear = Math.max(0, Math.min(1, grown * coils - c));
        if (appear <= 0) continue;
        const cy = y + 0.12 + c * (height * 0.4 / coils) + 0.05 * t;
        const radius = (0.4 + 0.06 * c) * Math.max(0.75, height / 1.4);
        for (let s = 0; s < perCoil; s++) {
            if (s / perCoil > appear) break;
            const angle = s / perCoil * Math.PI * 2 + c * 0.8 + t * 2.2;
            frame.sprite(PowerWhipCoil, x + Math.cos(angle) * radius, cy, z + Math.sin(angle) * radius,
                0.2 + 0.07 * c, angle * 40, 0xE06FA83C | 0, 0, true);
        }
    }
});
