/**
 * 吹飞 / whirlwind 的客户端表现。
 *
 * 一句话：施法者身前聚起打着旋的气流，随即一道竖立的淡青白风幕贴着地面向前推出去；风幕的推进端沿每条风线
 *   按墙起伏——被墙挡住的一段停在原地、向两侧散尘，开口处风丝继续向前；被扫到的敌人被托起、挂着风尘沿风向滑出。
 * 色相家族：淡青白（0xCFE8EC 主体、0xA9CBD4 余韵）＋近白（0xF2FCFF）只做风锋高光；没有第二个色相。
 * 拍子：起（windup 聚风）→ 推（逐列风幕每拍更新到实际风面）→ 结果（swept 逐目标）→ 空（miss 落空）。
 * 主体在自定义场景 move_whirlwind_curtain：服务端每拍给出每条风线的真实推进端点与真实帘高，客户端逐列画竖立
 *   风段，只有相邻列前沿接近时才连线——被墙截住的一列停住、空隙自然断开，不再连成一面斜墙。
 * 数：风尘数量由 `data.motes`（速度派生）驱动；风幕半径随 `data.scale`（风道半径 / 1.7）伸缩。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const WhirlwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.35, 0.6], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spin: 16,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xCFE8EC, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0.4], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.6, thickness: 0 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xA9CBD4, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        swept: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 6 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 28,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xCFE8EC, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "streak", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.2, 0.02],
                    color: 0xF2FCFF, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.8, thickness: 0 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8FA8AE, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_whirlwind", 1, WhirlwindDefinition);

const WhirlwindWind = "cobblemon:particle/generic/swirlingwind";
const WhirlwindGrit = "cobblemon:particle/generic/tinydust";

function whirlwindNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function whirlwindPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const out: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const p = value[i];
        if (Array.isArray(p) && p.length === 3 && (p as any[]).every(n => typeof n === "number" && isFinite(n)))
            out.push([Number(p[0]), Number(p[1]), Number(p[2])]);
    }
    return out;
}
function whirlwindColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 逐列风幕：服务端每拍给出每条风线的真实推进端点与真实帘高。每列单独画一段竖立风段，只有相邻列前沿接近时才在
 * 中间与顶部连线；被墙截住的一列停在原地，于是和前进列之间自然留出缺口，不再连成一面斜墙。风尘与前沿高光按
 * `data.motes` 与真实带宽/高度铺开，判定与画面读同一组端点。
 */
WorldCombatClient.scene("world_combat:move_whirlwind_curtain", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const base = whirlwindPoints(data.path);
    if (!base.length) return;
    const fronts: number[] = Array.isArray(data.fronts) ? (data.fronts as any[]).map(n => whirlwindNumber(n, 0)) : [];
    const height = Math.max(0.6, whirlwindNumber(data.height, 1.4));
    const scale = Math.max(0.5, Math.min(2.4, whirlwindNumber(data.scale, 1)));
    const motes = Math.max(6, Math.min(48, Math.round(whirlwindNumber(data.motes, 16))));
    const depth = Math.max(0.25, whirlwindNumber(data.depth, 0.8));
    const front = Math.max(0, whirlwindNumber(data.front, 0));
    const tick = frame.serverTick();
    const wind = whirlwindColour(0.55, 0xCFE8EC);
    const windSoft = whirlwindColour(0.36, 0xA9CBD4);
    const windTip = whirlwindColour(0.6, 0xF2FCFF);

    for (let i = 0; i < base.length; i++) {
        const p = base[i];
        frame.line(p[0], p[1], p[2], p[0], p[1] + height, p[2], wind);
    }
    for (let i = 1; i < base.length; i++) {
        const a = base[i - 1], b = base[i];
        const gap = fronts.length > i ? Math.abs(fronts[i] - fronts[i - 1]) : 0;
        if (gap > depth) continue;
        frame.line(a[0], a[1] + height * 0.72, a[2], b[0], b[1] + height * 0.72, b[2], windSoft);
        frame.line(a[0], a[1] + height, a[2], b[0], b[1] + height, b[2], windTip);
    }
    const perColumn = Math.max(2, Math.round(motes / base.length));
    for (let i = 0; i < base.length; i++) {
        const p = base[i];
        for (let k = 0; k < perColumn; k++) {
            const t = (k + 0.5) / perColumn;
            const phase = i * 1.7 + k * 0.9 + tick * 0.18;
            const wobble = Math.sin(phase) * 0.09;
            const size = (0.16 + 0.12 * (1 - t)) * scale * (1 + 0.1 * Math.sin(phase));
            frame.sprite(WhirlwindWind, p[0] + wobble, p[1] + height * t, p[2] + wobble * 0.5, size, 0,
                whirlwindColour(0.5, 0xCFE8EC), (i + k) % 27, true);
        }
    }
    for (let i = 0; i < base.length; i++) {
        if (fronts.length > i && fronts[i] + 0.05 < front) continue;
        const p = base[i];
        frame.sprite(WhirlwindGrit, p[0], p[1] + height + 0.12, p[2], 0.16 + 0.1 * scale, 0, windTip, 0, false);
    }
});
