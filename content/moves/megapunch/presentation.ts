/**
 * 百万吨重拳 / megapunch 的客户端表现。
 *
 * 一句话：拳头收在腰间攥亮，随后**一枚明确的拳**沿实际拳路从收拳推到出拳（自定义场景，按真实
 * `data.path`/`data.start`/`data.swing` 插值），拳道两侧标出 `data.bore` 的拳管宽度；冲击环沿同一条带
 * 向前推远；被正中的目标身上炸开一记钝击、随即拖着尘屑沿同一条线被轰飞；撞到实墙就在墙面磕出尘屑。
 * 色相家族：暖白（0xFFF2DA）与沙金（0xC9B37A），中性尘灰作余韵；饱和色只出现在拳面核心的小面积。
 * 拍子：起 charge（收拳蓄势）→ 击 thrust（一枚拳沿拳路推出＋冲击环）与 hit（命中钝击）→ 收 launch（被轰飞）、
 *   wall（砸墙，接触面）与 whiff（破风）。
 * 范围：thrust 的冲击环与自定义拳形都用 `data.path`（与判定同一组端点）；拳管宽度由自定义场景画出的
 *   两条平行线表示，玩家一眼看出这条带多宽、站在里面会挨打。
 * 运动：一枚拳由自定义场景沿 `data.path` 推进；冲击环沿 `data.direction` 从施法者朝目标方向推出。
 * 数：冲击环数绑 `data.rings`（物攻换算），拳的尾迹密度绑 `data.flows`，命中强度绑 `data.intensity`。
 */
const MegapunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.26, 0.06],
                    color: 0xFFF2DA, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xC9B37A, alpha: [0.5, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        thrust: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: 24 },
                    direction: "shape", orient: "direction", speed: [0.14, 0.34], spread: 6,
                    lifetime: [4, 8], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "rings", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    shape: { kind: "polyline" }, burst: { count: { data: "rings", fallback: 4 }, interval: 2 },
                    direction: "shape", orient: "direction", speed: [0.2, 0.46],
                    lifetime: [5, 10], size: [0.32, 0.08], sizeMode: "index",
                    color: 0xFFF2DA, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30,
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xB9A98C, alpha: [0.7, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 40
                },
                {
                    name: "crack", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 6, interval: 2 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "smack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        launch: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "puff", bind: "target", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xB9A98C, alpha: [0.5, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 16, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.55, angleDegrees: 30 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC9B37A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megapunch", 1, MegapunchDefinition);

/**
 * 一枚明确的拳：服务端在出拳时发一次，带真实拳路端点、瞄准方向、拳管半宽 bore、起拳刻与推进刻数；
 * 客户端据 serverTick 让拳从起点真实推进到实墙/满程终点，并在拳道两侧画出 bore 宽的平行线，读得出
 * 「一记厚拳沿这条窄管打过去」而不是一串散拳。固定绘制（1 枚拳 + 2 条拳道线 + 至多 8 点尾迹），
 * 复用原生图集，不生成粒子或额外实体。
 */
const MegapunchFist = "cobblemon:particle/generic/bigfist";
const MegapunchFrames = 9;

function megapunchNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function megapunchVector(value: any): number[] {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n: any) { return typeof n === "number" && isFinite(n); })
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : [0, 0, 0];
}

function megapunchColor(alpha: number, rgb: number): number {
    return ((Math.max(0, Math.min(255, Math.round(alpha * 255))) << 24) | rgb) | 0;
}

WorldCombatClient.scene("world_combat:move_megapunch_fist", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "thrust") return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const from = megapunchVector(path[0]), to = megapunchVector(path[path.length - 1]);
    const direction = megapunchVector(data.direction);
    const flat = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);
    const bore = Math.max(0.1, megapunchNumber(data.bore, 0.55));
    const start = megapunchNumber(data.start, frame.serverTick());
    const swing = Math.max(1, megapunchNumber(data.swing, 6));
    const intensity = Math.max(0.4, Math.min(2.4, megapunchNumber(data.intensity, 1)));
    const scale = Math.max(0.5, Math.min(1.8, megapunchNumber(data.scale, 1)));
    const flows = Math.max(0, Math.min(40, Math.round(megapunchNumber(data.flows, 90) / 16)));
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / swing));
    const fx = from[0] + (to[0] - from[0]) * t, fy = from[1] + (to[1] - from[1]) * t, fz = from[2] + (to[2] - from[2]) * t;
    // 拳管两侧：沿水平横向单位向量偏 ±bore 画两条平行线，长度就是这一拳覆盖的拳道路段。
    const sx = flat > 1e-4 ? -direction[2] / flat : 1, sz = flat > 1e-4 ? direction[0] / flat : 0;
    const lane = megapunchColor(0.5 * Math.min(1, intensity), 0xC9B37A), laneEdge = megapunchColor(0.32 * Math.min(1, intensity), 0xFFF2DA);
    frame.line(from[0] + sx * bore, from[1] + 0.02, from[2] + sz * bore, to[0] + sx * bore, to[1] + 0.02, to[2] + sz * bore, lane);
    frame.line(from[0] - sx * bore, from[1] + 0.02, from[2] - sz * bore, to[0] - sx * bore, to[1] + 0.02, to[2] - sz * bore, lane);
    // 短尾迹：从起点到拳当刻位置的一段实心亮线，标出拳已经推进到哪。
    frame.line(from[0], from[1] + 0.05, from[2], fx, fy + 0.05, fz, laneEdge);
    // 拳形：一枚拳贴当刻位置，尺寸随体型（data.scale），帧随 serverTick 走图集。
    frame.sprite(MegapunchFist, fx, fy, fz, 0.42 + 0.24 * scale, 0,
        megapunchColor(0.9, 0xFFF2DA), Math.floor(frame.serverTick() * 0.7) % MegapunchFrames, true);
    // 少量尾迹拳影沿拳道留在拳后，密度由 flows 决定（固定上限，不生成粒子）。
    for (let i = 1; i <= flows; i++) {
        const back = t - i * 0.16;
        if (back <= 0) break;
        const bx = from[0] + (to[0] - from[0]) * back, by = from[1] + (to[1] - from[1]) * back, bz = from[2] + (to[2] - from[2]) * back;
        frame.sprite(MegapunchFist, bx, by, bz, Math.max(0.1, 0.3 - i * 0.02) + 0.12 * scale, 0,
            megapunchColor(Math.max(0.08, 0.5 - i * 0.06), 0xC9B37A), Math.floor(back * MegapunchFrames) % MegapunchFrames, true);
    }
});
