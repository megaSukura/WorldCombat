/**
 * 火焰牙 / firefang 的客户端表现。
 *
 * 一句话：牙间燃起火种、火星顺牙面乱窜 → 上下两列獠牙在真实接触点闭合一次、同点炸开火色迸溅，随即火苗从伤口里往外冒
 * （火种被按进肉里）；若对手免疫灼伤，同一点的火只向外炸开、四散熄灭；被咬懵的人头顶晃出火色星子。
 * 色相家族：火橙（0xFF7A2A）与余烬金（0xFFD08A），近白只出现在咬实峰值一点。
 * 拍子：起 charge（牙间聚火）→ 咬 bite（合牙+迸溅）／ scatter（免疫散火）／ miss（空咬收牙）→ 灌 sear → 懵 flinch。
 * 合牙：獠牙不是向四周散开的剪影，而是由 custom scene `world_combat:move_firefang_fangs` 在入口点按真实方向摆出上/下两列，
 *   在几刻内闭合并淡出；粒子定义只留同点的火色迸溅与余烬。
 * 范围：bite／scatter／sear 绑命中点，画出的就是咬中的位置与伤口；miss 落在真实空咬/撞墙停下的位置（bind point）。
 * 运动：scatter 的火星从表面向外迸出并熄落；sear 的火苗从伤口向上冒并向外舔；flinch 的星子从目标头顶向上飘。
 * 数：`data.embers`（特攻派生）决定咬中迸溅、散火与伤口火星的数量；`data.intensity`（威力 / 66）抬高密度与亮度；
 * `data.scale`（獠牙判定 / 0.42）放大牙影与判定环。
 */
const FirefangDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0xFF7A2A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 44
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.42, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.14], spread: 20,
                    lifetime: [5, 10], size: [0.09, 0.03],
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        bite: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fire_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "shreds", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xFF7A2A, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        sear: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wound_fire", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 44
                },
                {
                    name: "lick", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 6 }, interval: 2 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xFFD08A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        scatter: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "deflect", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [5, 10], size: [0.09, 0.03],
                    color: 0xFFD08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "bounce", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "embers", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.14, 0.34],
                    gravity: 0.06, drag: 0.88,
                    lifetime: [5, 9], size: [0.12, 0.03],
                    color: 0xFF7A2A, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 50
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dazed", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xFFD08A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xD8A47A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firefang", 1, FirefangDefinition);

/**
 * 合牙：在服务端给出的真实接触点，按瞄准方向摆出上、下两列獠牙，几刻内闭合一次再淡出。
 * 固定数量（每列 4 枚），不生成粒子或实体；方向来自本招实际 aim，牙尖落在接触点那一格。
 */
const FirefangFangTexture = "cobblemon:particle/generic/fang";
function firefangFangVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function firefangFangUnit(value: number[]): number[] {
    const length = Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    return length > 1e-6 ? [value[0] / length, value[1] / length, value[2] / length] : [0, 0, 1];
}
function firefangFangCross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
WorldCombatClient.scene("world_combat:move_firefang_fangs", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "close") return;
    const scale = Math.max(0.6, Math.min(1.8, typeof data.scale === "number" && isFinite(data.scale) ? data.scale : 1));
    const forward = firefangFangUnit(firefangFangVector(data.direction, [0, 0, 1]));
    let reference = [0, 1, 0];
    if (Math.abs(forward[0] * reference[0] + forward[1] * reference[1] + forward[2] * reference[2]) > 0.95) reference = [1, 0, 0];
    const right = firefangFangUnit(firefangFangCross(forward, reference));
    const up = firefangFangUnit(firefangFangCross(right, forward));
    const start = typeof data.start === "number" && isFinite(data.start) ? data.start : frame.serverTick();
    const age = Math.max(0, frame.serverTick() - start);
    const close = Math.min(1, age / 5);
    const fade = age <= 6 ? 1 : Math.max(0, 1 - (age - 6) / 6);
    if (fade <= 0) return;
    const alpha = Math.round(235 * fade);
    const count = 4, spread = 0.26 * scale;
    const gap = (0.30 * (1 - close) + 0.02) * scale;
    const px = entry.position[0], py = entry.position[1], pz = entry.position[2];
    for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * spread;
        const bx = px + right[0] * along, by = py + right[1] * along, bz = pz + right[2] * along;
        frame.sprite(FirefangFangTexture, bx + up[0] * gap, by + up[1] * gap, bz + up[2] * gap,
            0.16 * scale, 180, (alpha << 24 | 0xFFF1D6) | 0, 0, true);
        frame.sprite(FirefangFangTexture, bx - up[0] * gap, by - up[1] * gap, bz - up[2] * gap,
            0.16 * scale, 0, (alpha << 24 | 0xFFE0B0) | 0, 0, true);
    }
});
