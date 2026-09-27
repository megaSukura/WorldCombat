/**
 * 旋风刀 / razorwind 的客户端表现。
 *
 * 一句话：站定后一圈风刃在身周拧起、越积越多越亮，随后整把扇子朝身前铺开，每一拍的真实前缘短促亮起，
 *   扇面里的目标被风刃扫出成片碎屑；真切中要害时再闪一记亮白。
 * 色相家族：淡青白与近白（swirlingwind／cut／softswipe 的青白偏色）＋中性尘（tinydust）＋白色强调。
 * 拍子：蓄（charge 风刃绕身收拢成冠）→ 发（release 三段扇面按段亮起）→ 切（cut 命中爆）→ 强调（crit 要害）。
 * 范围：release 用 `data.path`（与服务端 `razorwindBand` 同一段被墙截短的扇带顶点）按 `data.band` 逐段填充；
 *   `data.blades` 绑定绕身风刃冠的发射量，`data.motes` 绑定扇面与命中的风屑量。
 * 前缘：`world_combat:move_razorwind_edge` 自定义场景沿 `data.edge`（该拍外弧、与判定同源）画一条短亮线，
 *   固定顶点、固定数量，不生成粒子或实体。
 */
const RazorwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 26 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "crown", bind: "source", offset: [0, 0.8, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: { data: "blades", fallback: 6 }, shape: { kind: "ring", radius: 0.95 },
                    direction: "inward", speed: [0.05, 0.16], spin: 20,
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xDFF3E6, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "whet", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 10, shape: { kind: "sphere", radius: 0.85 }, direction: "inward", speed: [0.05, 0.15],
                    lifetime: [6, 12], size: [0.16, 0.04], spriteFrom: "random",
                    color: 0xE8F6EE, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "orbit", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 6, shape: { kind: "ring", radius: 1.0 }, direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xA8D8C0, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polygon" }, rate: { data: "motes", fallback: 22 }, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.3, 0.06],
                    color: 0xDFF3E6, alpha: [0.3, 0], light: "full", maxParticles: 130
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wound", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.22], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6F6EC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "shred", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9FB8AA, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 16
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xEAFBF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "disperse", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6B8AE, alpha: [0.32, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_razorwind", 1, RazorwindDefinition);

/** 该拍真实前缘：沿外弧顶点画一条短亮线并在弧上点几枚固定刃形贴图；数量固定、路径由服务端给定。 */
const RazorwindEdge = "cobblemon:particle/generic/softswipe";
function razorwindNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function razorwindPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (Array.isArray(entry) && entry.length === 3 && entry.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            points.push([Number(entry[0]), Number(entry[1]), Number(entry[2])]);
    }
    return points;
}

WorldCombatClient.scene("world_combat:move_razorwind_edge", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const edge = razorwindPoints(data.edge);
    if (edge.length < 2) return;
    const intensity = Math.max(0.6, Math.min(2.4, razorwindNumber(data.intensity, 1)));
    const alpha = Math.round(Math.min(1.5, intensity) * 200);
    for (let i = 1; i < edge.length; i++) {
        const a = edge[i - 1], b = edge[i];
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], ((alpha << 24) | 0xFFFFFF) | 0);
    }
    const step = edge.length > 6 ? 2 : 1;
    for (let i = 0; i < edge.length; i += step) {
        const at = edge[i];
        frame.sprite(RazorwindEdge, at[0], at[1] + 0.1, at[2], 0.28 + 0.1 * intensity, 0,
            ((Math.round(alpha * 0.9) << 24) | 0xFFFFFF) | 0, 0, true);
    }
});
