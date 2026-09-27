/**
 * 分担痛楚 / painsplit 的客户端表现。
 *
 * 一句话：一条细红的痛线在两者之间牵起；谁的生命更高，就从谁身上抽出一股与实际失血相称的红光，沿真实方向送到被治疗者，
 * 在两端各落一圈落定光。部分抵抗时那股光更细，抽血被拒绝时痛线从中间断开、没有回流。
 * 色相家族：痛楚红橙（smallfadeorb / energyorb / xsboost）为主，近白高光（mediumring）落在得到治疗的一端。
 * 拍子：量（reach 细线与两端心跳）→ 抽（drain 失血方爆开、红光从付款端实际走向受治者）→ 落（settle 到达端脉冲）／断（refused 空断）／平（flat）。
 * 范围与位置：`reach` 沿 data.path 的施法者—目标顶点铺开；`drain` 绑在失血者的真实位置，实际横跨由自定义场景
 *   `move_painsplit_thread` 完成：它读服务端给的付款端/收款端引用，每帧把光心放在两点**当前真实位置**的连线上，
 *   从付款端逐刻走到收款端，而不是沿整条线一次采样；`settle` 绑在受治者的真实位置。判定走到哪两个身体，画面就画在哪两个身体。
 * 数：`data.flow`（实际失血 / 双方较大上限 派生的流动粒子数）驱动失血爆点与流动光点密度，抽得越多越密；
 *   `data.arrive`（实际治疗量派生）驱动到达端的回填光；`data.scale` 按体型放大光点。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PainsplitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.08, 0.015],
                    color: 0xFF8A72, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "beatSelf", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "beatFoe", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "thread", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline", closed: false },
                    rate: 10, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.015],
                    color: 0xE06450, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 50
                },
                {
                    name: "loss", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "flow", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [7, 13], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFF6B5A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "arrival", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "arrive", fallback: 8 }, at: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0xFFD9D0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "landing_ring", bind: "point", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.55, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.06],
                    color: 0xFFC9BC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        refused: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.012],
                    color: 0x8C5A52, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        flat: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "level", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xB9AFA0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8C5A52, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_painsplit", 1, PainsplitDefinition);

/**
 * 分账后的真实走向：付款端到收款端的红光从付款端逐刻送到收款端，读的是两者当前真实位置，
 * 不是沿整条线一次采样。光心位置由 `data.start`/`data.travel` 与服务端刻算出，流动光点数由 `data.flow` 派生。
 */
const PainsplitThreadBead = "cobblemon:particle/generic/orb/xsboost";
const PainsplitThreadHead = "cobblemon:particle/generic/orb/smallfadeorb";

function painsplitNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function painsplitClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function painsplitColour(alpha: number, rgb: number): number { return ((Math.round(255 * painsplitClamp(alpha, 0, 1)) << 24) | rgb) | 0; }

WorldCombatClient.scene("world_combat:move_painsplit_thread", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const payer = JSON.parse(frame.anchor(String(data.payer || entry.source)));
    const receiver = data.receiver ? JSON.parse(frame.anchor(String(data.receiver))) : null;
    if (!payer || !receiver) return;
    const start = painsplitNumber(data.start, frame.serverTick());
    const travel = Math.max(2, painsplitNumber(data.travel, 6));
    const age = frame.serverTick() - start;
    const progress = painsplitClamp(age / travel, 0, 1);
    const fade = 1 - painsplitClamp((age - travel) / 10, 0, 1);
    if (fade <= 0) return;
    const scale = painsplitClamp(painsplitNumber(data.scale, 1), 0.5, 2);
    const from = [payer.x, payer.y + 0.55, payer.z], to = [receiver.x, receiver.y + 0.55, receiver.z];
    const head = [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress, from[2] + (to[2] - from[2]) * progress];
    const thread = painsplitColour(0.6 * fade, 0xFF6B5A);
    frame.line(from[0], from[1], from[2], head[0], head[1], head[2], thread);
    const beads = painsplitClamp(Math.round(painsplitNumber(data.flow, 14) * 0.6), 3, 24);
    for (let i = 0; i < beads; i++) {
        const t = (i + 1) / (beads + 1) * progress;
        const px = from[0] + (to[0] - from[0]) * t, py = from[1] + (to[1] - from[1]) * t, pz = from[2] + (to[2] - from[2]) * t;
        const wobble = Math.sin(age * 0.8 + i * 1.9) * 0.05;
        frame.sprite(PainsplitThreadBead, px, py + wobble, pz, 0.09 * scale, 0, painsplitColour(0.8 * fade, 0xFFB199), Math.floor(frame.serverTick() / 2 + i), true);
    }
    frame.sprite(PainsplitThreadHead, head[0], head[1], head[2], 0.16 * scale, 0, painsplitColour(0.95 * fade, 0xFFD9D0), 0, true);
});
