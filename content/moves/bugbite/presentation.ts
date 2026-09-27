/**
 * 虫咬 / bugbite 的客户端表现。
 *
 * 一句话：施法者在真实嘴前张开双颚、口边聚起虫绿色的光，扑上去一口咬在对手身上（咬开树果时迸出果屑果叶），
 * 接着含在原地咀嚼，绿色的果汁光点向嘴前收拢，最后顺着喉咙亮起一圈暖绿、把果子的效果吞进身体。
 * 色相家族：虫绿（impact_bug / 果叶）为主，果肉汁水用亮黄绿，近白只在牙口与击点作衬。
 * 拍子：起（rear 嘴前聚汁）→ 咬（bite 咬合 + `move_bugbite_jaws` 双颚合拢）→ 嚼（chew 咀嚼果屑）→ 得（gain 咽下见效）／空（miss 扑空）。
 * 范围：bite 绑命中点，画出的就是被咬中的位置；双颚由 `move_bugbite_jaws` 按 `data.from`→`data.contact` 合到真实碰点。
 *   chew／gain 由服务端给出真实嘴前的世界点（`data.point`），不再用固定世界轴偏移。
 * 运动：张颚时绿光向内聚；咬合是短促外爆加果屑外散；咀嚼时果汁光点绕口回旋；咽下是一圈由下向上的暖绿。
 * 数：`data.motes`（物攻派生的果屑数）驱动张颚与咀嚼的粒子量；`data.gain`（回复／能力等级／解异常折算的层数）
 *     驱动咽下那一圈的量；`data.berry`（是否真的咬到树果）决定咬合是否带果屑层。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BugBiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        rear: {
            duration: 22,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "sap", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9ED47A, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "crunch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD8E88A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 36
                },
                {
                    name: "mark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bite",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: 9, size: [0.34, 0.08],
                    color: 0xB6C84E, alpha: [0.85, 0], light: "full", maxParticles: 3
                },
                {
                    name: "bits", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "bits", fallback: 12 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.03, spin: 12,
                    lifetime: [8, 18], size: [0.1, 0.02],
                    color: 0xA8D050, alpha: [0.9, 0], light: "world", maxParticles: 90
                }
            ]
        },
        chew: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "juice", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xBEE060, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "crumbs", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 4, repeats: 4 },
                    shape: { kind: "sphere", radius: 0.22 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.05, spin: 10,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x9ED47A, alpha: [0.9, 0], light: "world", maxParticles: 90
                }
            ]
        },
        gain: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "swallow", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "gain", fallback: 6 } }, shape: { kind: "cylinder", radius: 0.35, length: 0.9 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xA8E070, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "warm", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.5, 0.18],
                    color: 0xA8E070, alpha: [0.6, 0], light: "full", maxParticles: 4
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "overrun", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x9BA878, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bugbite", 1, BugBiteDefinition);

/**
 * 双颚：在真实碰点（`data.contact`）按本招实际 aim 摆出上、下两列獠牙，几刻内闭合并淡出；从
 * `data.from`（真实嘴前）拉一条颚线到碰点。固定数量（每列 2 枚，共 4 口牙），不生成粒子或实体。
 * `data.hold` 时保持张开（起手预告），否则按 `data.start` 起算闭合。
 */
const BugbiteFangTexture = "cobblemon:particle/generic/fang";
function bugbiteJawVec(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function bugbiteJawNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function bugbiteJawUnit(value: number[]): number[] {
    const length = Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    return length > 1e-6 ? [value[0] / length, value[1] / length, value[2] / length] : [0, 0, 1];
}
function bugbiteJawCross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
WorldCombatClient.scene("world_combat:move_bugbite_jaws", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "jaws") return;
    const from = bugbiteJawVec(data.from, [0, 0, 0]);
    const contact = bugbiteJawVec(data.contact, from);
    const scale = Math.max(0.6, Math.min(1.8, bugbiteJawNumber(data.scale, 1)));
    const forward = bugbiteJawUnit([contact[0] - from[0], contact[1] - from[1], contact[2] - from[2]]);
    let reference = [0, 1, 0];
    if (Math.abs(forward[0] * reference[0] + forward[1] * reference[1] + forward[2] * reference[2]) > 0.95) reference = [1, 0, 0];
    const right = bugbiteJawUnit(bugbiteJawCross(forward, reference)), up = bugbiteJawUnit(bugbiteJawCross(right, forward));
    const hold = data.hold ? true : false;
    const start = bugbiteJawNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const close = hold ? 0.15 : Math.min(1, age / 4);
    const fade = hold ? 1 : age <= 5 ? 1 : Math.max(0, 1 - (age - 5) / 6);
    if (fade <= 0) return;
    const alpha = Math.round(235 * fade);
    frame.line(from[0], from[1], from[2], contact[0], contact[1], contact[2], (Math.round(140 * fade) << 24 | 0xA8B820) | 0);
    const count = 2, spread = 0.24 * scale, gap = (0.28 * (1 - close) + 0.03) * scale;
    const ax = contact[0] - forward[0] * 0.06 * scale, ay = contact[1] - forward[1] * 0.06 * scale, az = contact[2] - forward[2] * 0.06 * scale;
    for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * spread;
        const bx = ax + right[0] * along, by = ay + right[1] * along, bz = az + right[2] * along;
        frame.sprite(BugbiteFangTexture, bx + up[0] * gap, by + up[1] * gap, bz + up[2] * gap, 0.16 * scale, 180, (alpha << 24 | 0xD8E88A) | 0, 0, true);
        frame.sprite(BugbiteFangTexture, bx - up[0] * gap, by - up[1] * gap, bz - up[2] * gap, 0.16 * scale, 0, (alpha << 24 | 0xC8D86A) | 0, 0, true);
    }
});
