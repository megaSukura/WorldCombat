/**
 * 木枝突刺 / branchpoke 的客户端表现。
 *
 * 一句话：身侧的枝叶收拢、枝尖聚起一点绿光，随后一根细枝从枝根逐刻绷直朝目标伸出、末梢在接触点弯弹一下再收回，
 * 细叶随枝线陪衬；只有真的戳到目标时枝梢才在接触点弹亮、冒出一小簇嫩芽，命中处炸开草系冲击与散叶，
 * 刺枝式还会在目标身上盖一点挂枝的绿环。
 * 色相家族：叶绿（0x8CC24E）作主体、亮黄绿（0xB6E06A）作细节、近白（0xEAF8C8）作强调；中性尘屑收尾。
 * 拍子：起 coil（收枝聚光）→ 主体 twig（自定义场景：枝线绷直→末梢弯弹→收回，细叶陪衬）→
 *   击 hit（散叶）与 tip（实际末梢命中时弹亮）／挂枝 snare ／空 miss。
 * 主体在自定义场景 move_branchpoke_twig：服务端给出同一组枝根 `origin` 与枝梢 `tip`（含墙面截断）、
 *   命中点 `contact` 与 `start`/`grow`/`hold`/`pull`，客户端逐帧只画当前真实子段与末梢；判定与表现共用端点。
 * 数：枝线与命中散叶的量绑 `data.leaves`（物攻换算），tip 的嫩芽量绑 `data.tipLeaves`（按末梢距离比例递减），
 *   末梢嫩芽与命中的尺寸读 `data.scale`（服务端传的「越远越疼」倍率，1 + 弹劲 × 距离比例）——戳得越远、枝梢越饱满。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BranchpokeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 12,
            exit: { stop: 4, drain: 9 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0x8CC24E, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        tip: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "sprout", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "tipLeaves", fallback: 8 }, at: 0 }, shape: { kind: "ring", radius: 0.2 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xB6E06A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 26
                },
                {
                    name: "seed", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "tipLeaves", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 9, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.07, 0.22], spread: 22,
                    lifetime: [4, 8], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF8C8, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "scatter", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "leaves", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 40, spin: 14,
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.75, 0], light: "full", maxParticles: 50
                }
            ]
        },
        snare: {
            // 长度跟实际挂枝时长 `data.snareTicks` 走：状态多久，标记就吸附多久，不再固定 22 刻。
            duration: { data: "snareTicks", fallback: 22 },
            exit: { stop: { data: "snareTicks", fallback: 22 }, drain: 13 },
            emitters: [
                {
                    name: "bind", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 7, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x8CC24E, alpha: [0.45, 0], light: "full", bloom: 0.25, maxParticles: 24
                },
                {
                    name: "snag", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 5, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xB6E06A, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "leaves", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [7, 13], size: [0.09, 0.02],
                    color: 0x8CC24E, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_branchpoke", 1, BranchpokeDefinition);

function branchpokeNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }
function branchpokeClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function branchpokeColour(alpha: number, rgb: number): number { return ((Math.round(255 * branchpokeClamp(alpha, 0, 1)) << 24) | rgb) | 0; }

/** 木枝突刺的主体：沿服务端真实枝根/枝梢画当前绷直的一段，末梢弯弹后收回，细叶随枝线陪衬。 */
WorldCombatClient.scene("world_combat:move_branchpoke_twig", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const origin = data.origin, tip = data.tip;
    if (!Array.isArray(origin) || origin.length !== 3 || !Array.isArray(tip) || tip.length !== 3) return;
    const start = branchpokeNumber(data.start, frame.serverTick());
    const grow = Math.max(1, branchpokeNumber(data.grow, 4));
    const hold = Math.max(0, branchpokeNumber(data.hold, 4));
    const pull = Math.max(1, branchpokeNumber(data.pull, 6));
    const age = frame.serverTick() - start;
    // 绷直 → 末梢弯弹 → 收回：三段的进度。
    let frac = 1, spring = 0;
    if (age <= grow) frac = branchpokeClamp(age / grow, 0, 1);
    else if (age <= grow + hold) { frac = 1; spring = Math.sin((age - grow) / Math.max(1, hold) * Math.PI); }
    else frac = branchpokeClamp(1 - (age - grow - hold) / pull, 0, 1);
    if (frac <= 0) return;
    const scale = branchpokeNumber(data.scale, 1);
    const dx = tip[0] - origin[0], dy = tip[1] - origin[1], dz = tip[2] - origin[2];
    const flat = Math.sqrt(dx * dx + dz * dz);
    // 末梢弯弹的侧向：沿枝身的水平垂线弓起，弹一下再回正。
    const springAmount = scale * 0.22 * spring;
    const sx = flat > 1e-4 ? -dz / flat : 1, sz = flat > 1e-4 ? dx / flat : 0;
    const colour = branchpokeColour(0.85, 0x8CC24E);
    const highlight = branchpokeColour(0.95, 0xEAF8C8);
    const segments = 5;
    let px = origin[0], py = origin[1], pz = origin[2];
    for (let s = 1; s <= segments; s++) {
        const f = frac * s / segments, bendF = Math.sin(Math.PI * f) * springAmount;
        const cx = origin[0] + dx * f + sx * bendF, cy = origin[1] + dy * f, cz = origin[2] + dz * f + sz * bendF;
        frame.line(px, py, pz, cx, cy, cz, s === segments ? highlight : colour);
        px = cx; py = cy; pz = cz;
    }
    // 细叶陪衬：沿当前枝线散几片，越靠末梢越亮。
    const leaves = branchpokeClamp(Math.round(branchpokeNumber(data.leaves, 14) * frac), 2, 40);
    for (let i = 0; i < leaves; i++) {
        const f = (i + 0.5) / leaves * frac, bendF = Math.sin(Math.PI * f) * springAmount;
        const a = i * 2.4 + frac * 6, r = 0.05 + 0.12 * (i / leaves);
        frame.sprite("cobblemon:particle/generic/grass/smallleaf",
            origin[0] + dx * f + sx * bendF + Math.cos(a) * r,
            origin[1] + dy * f + 0.03 + Math.sin(a * 1.7) * r * 0.5,
            origin[2] + dz * f + sz * bendF + Math.sin(a) * r,
            0.06 + 0.03 * scale, 0, branchpokeColour(0.6, 0x8CC24E), 0, false);
    }
    // 末梢芽尖：绷直到位或弯弹时最亮；命中处的额外嫩芽由粒子场景的 tip 拍补齐。
    const tipBend = Math.sin(Math.PI * frac) * springAmount;
    frame.sprite("cobblemon:particle/generic/grass/sprout",
        origin[0] + dx * frac + sx * tipBend, origin[1] + dy * frac, origin[2] + dz * frac + sz * tipBend,
        0.11 + 0.05 * scale, 0, highlight, 0, true);
});
