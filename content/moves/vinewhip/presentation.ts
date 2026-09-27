/**
 * 藤鞭 / vinewhip 的客户端表现。
 *
 * 一句话：细藤从身侧弯起、朝瞄准方向绷直抽出去，命中后从梢头往回缩；末端甩出一记鞭梢闪点，沿途只掉几片短寿叶屑。
 * 命中点炸开一小簇叶片与草绿冲击，末端撞墙则在真实墙面磕出碎叶；双抽式是两段各自弯绷收回的独立抽击。
 * 色相家族：亮草绿（0x9BD05A 藤痕、0x6FA83C 叶）与米白鞭梢为主，无第二个色相。
 * 拍子：起 read（绷藤聚光）→ 抽 line/flick（细藤弯→绷直→收回）→ 击 hit（命中散叶）／撞墙 wall（墙面碎叶）→ 空 miss（抽空散叶）。
 * 本体：细藤由自定义场景 `move_vinewhip_line` 按服务端真实三维端点逐帧画「弯→绷直→收回」，判定与表现共用端点；
 *     粒子 `flick` 只作短寿叶屑陪衬，不再是整条线的散叶主角。双抽式为两次独立 emit，各抽各的。
 * 数：叶屑量绑 `data.leaves`（物攻与速度派生）；命中强度绑 `data.intensity`（本击威力 / 48）；
 *     线宽与鞭梢尺寸随 `data.scale`（真实线宽 / 0.45）变化，`data.reach` 记录本记真实长度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const VineWhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tense", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    spin: 8, lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        flick: {
            duration: 12,
            exit: { stop: 5, drain: 8 },
            emitters: [
                {
                    // 短寿叶屑：只作本体之外的陪衬，数量随 data.leaves。
                    name: "shavings", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 8 } },
                    shape: { kind: "polyline" },
                    direction: "away", speed: [0.04, 0.15],
                    spin: 10, lifetime: [4, 7], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9BD05A, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "wrist", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xCFE98A, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "tip", bind: "point", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 7, at: 1 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.06, 0.2],
                    spin: 14, lifetime: [4, 8], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xF2F8DC, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        },
        wall: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "chips", bind: "point", height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.06, drag: 0.92, spin: 10,
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9BD05A, alpha: [0.7, 0], light: "world", maxParticles: 34
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 9, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.24],
                    lifetime: [4, 8], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAF8B8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "scatter", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "notes", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.2],
                    spread: 45, spin: 14,
                    lifetime: [6, 12], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xA8DC64, alpha: [0.75, 0], light: "full", maxParticles: 55
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "notes", fallback: 10 } },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 140, rotation: [0, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    spin: 10, gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0x9BD05A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_vinewhip", 1, VineWhipDefinition);

const VineWhipLineLeaf = "cobblemon:particle/generic/grass/smallleaf";
const VineWhipLineTip = "cobblemon:particle/generic/grass/smallleaf_white";

function vinewhipNumberAt(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function vinewhipVecAt(value: any): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return null;
}

function vinewhipColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 细藤本体：服务端每记传回同一组真实端点与出手刻。一记内先弯起，再绷直，命中后从梢头收回；固定数量线段与贴图，
 * 没有粒子生灭或额外实体。墙在端点处截断，抽出的长度就是真正够到的长度。
 */
WorldCombatClient.scene("world_combat:move_vinewhip_line", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = vinewhipVecAt(path[0]), b = vinewhipVecAt(path[1]);
    if (!a || !b) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(length > 0.05)) return;
    const ux = dx / length, uy = dy / length, uz = dz / length;
    // 与鞭路垂直的稳定右向量；竖直瞄准时改用世界轴作参考。
    const reference = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let rx = uy * reference[2] - uz * reference[1];
    let ry = uz * reference[0] - ux * reference[2];
    let rz = ux * reference[1] - uy * reference[0];
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen; ry /= rlen; rz /= rlen;
    const vx = ry * uz - rz * uy, vy = rz * ux - rx * uz, vz = rx * uy - ry * ux;

    const start = vinewhipNumberAt(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const grow = Math.max(0, Math.min(1, age / 3.5));
    const retract = Math.max(0, Math.min(1, (age - 5.5) / 4.5));
    const span = Math.max(0.06, grow - retract);
    const alpha = Math.max(0.12, 1 - retract);
    const scale = Math.max(0.6, Math.min(1.8, vinewhipNumberAt(data.scale, 1)));
    // 未绷直时藤身向侧上方弯起；grow→1 时 sag→0，藤身绷成一条直线。
    const sag = (1 - grow) * 0.22 * Math.min(1, length / 2.5);
    const segments = 9;
    const ax = a[0], ay = a[1], az = a[2];
    function pointAt(t: number): number[] {
        const bend = sag * Math.sin(Math.PI * Math.max(0, Math.min(1, t / span)));
        return [ax + ux * length * t + vx * bend, ay + uy * length * t + vy * bend, az + uz * length * t + vz * bend];
    }
    for (let i = 0; i < segments; i++) {
        const p = pointAt(span * i / segments), q = pointAt(span * (i + 1) / segments);
        frame.line(p[0], p[1], p[2], q[0], q[1], q[2], vinewhipColour(0.9 * alpha, 0x9BD05A));
    }
    const tip = pointAt(span);
    frame.sprite(VineWhipLineTip, tip[0], tip[1], tip[2], 0.16 * scale, 0, vinewhipColour(alpha, 0xF2F8DC), 0, true);
    const leaves = Math.max(2, Math.min(7, Math.round(vinewhipNumberAt(data.leaves, 5) / 2)));
    for (let i = 0; i < leaves; i++) {
        const t = span * (0.18 + 0.68 * (i / Math.max(1, leaves - 1)));
        const p = pointAt(t);
        const side = (i % 2 === 0 ? 1 : -1) * 0.08;
        frame.sprite(VineWhipLineLeaf, p[0] + rx * side, p[1] + ry * side, p[2] + rz * side,
            (0.09 + 0.02 * (i % 3)) * scale, (i * 47) % 360, vinewhipColour(0.7 * alpha, 0x8CC24E), 0, true);
    }
});
