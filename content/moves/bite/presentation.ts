/**
 * 咬住 / bite 的客户端表现。
 *
 * 一句话：暗色牙光在口边聚一下 → 沿一条直线扑出、脚边扬尘 → 咬实的一刻在接触点炸开暗色迸溅，
 * 獠牙由 custom scene `world_combat:move_bite_jaws` 在真实接触点从上下两侧合拢；随即一道碎屑沿真实拽回路径
 * 被拉回施法者身前；被咬懵的人头顶晃出暗色星子。
 * 色相家族：暗紫（0x6A4E86 / 0x8A6AA8）与獠牙骨白（0xF0E6D2）；饱和色只出现在暗色核心一点。
 * 拍子：起 windup（口边聚光）→ 扑 pounce（沿 data.direction 掠过）→ 咬 bite（命中峰值）／ miss（扑空刹停）→ 拽 drag → 懵 flinch。
 * 范围：bite 绑命中点，画出的就是咬中的位置；pounce 的尘迹沿施法者实际走过的直线铺开；drag 的顶点是接触点与施法者真实位置。
 * 运动：速度线沿扑出方向掠过；drag 的碎屑沿 data.path（接触点→施法者）被拽回；flinch 的星子从目标头顶向上飘。
 * 数：`data.morsels`（威力派生）决定咬中迸溅的碎屑数，`data.intensity`（威力 / 62）抬高密度与亮度，
 * `data.drag`（实际拽回格数派生的碎屑数）决定 drag 层被拽回的碎屑数，`data.scale`（獠牙判定 / 0.4）放大牙影与判定环。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x8A6AA8, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "breathe", bind: "source", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.26, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.05, 0.02],
                    color: 0x6A4E86, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        pounce: {
            duration: 34,
            exit: { stop: 24, drain: 12 },
            emitters: [
                {
                    name: "dust_trail", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "bite_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.3, 0.28, 0.3] },
                    direction: "outward", speed: [0.05, 0.17],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xD8C6E6, alpha: [0.4, 0], light: "full", maxParticles: 130
                },
                {
                    name: "lunge_streak", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 16, orient: "direction", shape: { kind: "line", length: 0.7 }, direction: "shape",
                    speed: [0.03, 0.13],
                    lifetime: [4, 8], size: [0.2, 0.05],
                    color: 0xD8C6E6, alpha: [0.45, 0], light: "full", maxParticles: 70
                }
            ]
        },
        bite: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "dark_lash", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "morsels", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8A6AA8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "shreds", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "morsels", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x6A4E86, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        drag: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "reel", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "drag", fallback: 6 }, at: 1 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [5, 10], size: [0.07, 0.02], sizeMode: "index",
                    color: 0xC9B6D6, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dazed_stars", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0x8A6AA8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xB9A6C6, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bite", 1, BiteDefinition);

/**
 * 合牙：在真实接触点 `data.contact` 按本招实际 aim 摆出上、下两列獠牙，几刻内从两侧合拢再淡出。
 * 固定数量（每列 3 枚，共 6 口牙），不生成粒子或实体；`data.start` 是服务端给出的接触刻。
 */
const BiteFangTexture = "cobblemon:particle/generic/fang";
function biteJawVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function biteJawNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function biteJawUnit(value: number[]): number[] {
    const length = Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    return length > 1e-6 ? [value[0] / length, value[1] / length, value[2] / length] : [0, 0, 1];
}
function biteJawCross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
WorldCombatClient.scene("world_combat:move_bite_jaws", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "jaws") return;
    const scale = Math.max(0.6, Math.min(1.8, biteJawNumber(data.scale, 1)));
    const forward = biteJawUnit(biteJawVector(data.direction, [0, 0, 1]));
    let reference = [0, 1, 0];
    if (Math.abs(forward[0] * reference[0] + forward[1] * reference[1] + forward[2] * reference[2]) > 0.95) reference = [1, 0, 0];
    const right = biteJawUnit(biteJawCross(forward, reference)), up = biteJawUnit(biteJawCross(right, forward));
    const contact = biteJawVector(data.contact, entry.position);
    const start = biteJawNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const close = Math.min(1, age / 4);
    const fade = age <= 5 ? 1 : Math.max(0, 1 - (age - 5) / 6);
    if (fade <= 0) return;
    const alpha = Math.round(235 * fade);
    const count = 3, spread = 0.24 * scale, gap = (0.30 * (1 - close) + 0.02) * scale;
    for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * spread;
        const bx = contact[0] + right[0] * along, by = contact[1] + right[1] * along, bz = contact[2] + right[2] * along;
        frame.sprite(BiteFangTexture, bx + up[0] * gap, by + up[1] * gap, bz + up[2] * gap,
            0.16 * scale, 180, (alpha << 24 | 0xF0E6D2) | 0, 0, true);
        frame.sprite(BiteFangTexture, bx - up[0] * gap, by - up[1] * gap, bz - up[2] * gap,
            0.16 * scale, 0, (alpha << 24 | 0xD8C6E6) | 0, 0, true);
    }
});
