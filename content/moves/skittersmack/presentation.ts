/**
 * 爬击 / skittersmack 的客户端表现。
 *
 * 一句话：施法者压低身体、前肢刮地 → 贴地沿一条侧弧绕到目标身后、身后拖一条甲屑与尘点 → 最后肢端按真实的
 * reach 与 smackWidth 横扫一记，命中处炸开一圈甲壳冲击，头顶飘出被夺走的集中力光点；确实从背后拍中的那一个
 * 另出一道更亮的锐亮回执。
 * 色相家族：虫系的黄绿（0x9FB13A / 0xC7D855）为主，近白（0xF2F7D0）只给击点、背击与夺走的光点，尘收在灰绿。
 * 拍子：起 windup（刮地）→ 绕 scuttle（贴地弧线）→ 扫 sweep（真实扇面、肢尖扫过）→ 拍 strike（命中）/ back（背击）
 *    → 夺 focus（特攻被抽走）。
 * 范围：scuttle 沿 `data.path`（与服务端同一条绕行轨迹）画折线；sweep 由自定义场景 `world_combat:move_skittersmack/sweep`
 *   按实际 radius/span 画扇缘与肢尖，判定与表现共用起点与朝向。
 * 运动：scuttle 沿弧线贴地走；strike／back 的碎屑沿 `data.direction`（出手朝向）向外炸；focus 的光点向上升走。
 * 数：`data.motes`（物攻派生）绑定碎屑与被夺光点的数量，`data.intensity`（本次威力派生）抬高击点亮暗。
 */
const SkittersmackSweepScene = "world_combat:move_skittersmack/sweep";
const SkittersmackSlashSprite = "cobblemon:particle/generic/slash";
const SkittersmackCutSprite = "cobblemon:particle/generic/cut";

const SkittersmackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "scrape", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.09], gravity: 0.02,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC7D855, alpha: [0.6, 0], light: "world", maxParticles: 34
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xD8E36A, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        scuttle: {
            duration: 24,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    shape: { kind: "polyline" },
                    rate: 46, direction: "shape", speed: [0.02, 0.1], spread: 34,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x9FB13A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "skitter", bind: "source", offset: [0, 0.05, 0], height: 0.1, trail: { minDistance: 0.25 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xC7D855, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF2F7D0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.45],
                    color: 0xA8C63A, alpha: [0.75, 0], light: "world", maxParticles: 6
                },
                {
                    name: "shards", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 32, gravity: 0.03,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FA030, alpha: [0.85, 0], light: "world", maxParticles: 44
                }
            ]
        },
        back: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "pierce", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: 8, size: [0.4, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 14
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [8, 15], size: [0.24, 0.6],
                    color: 0xF2F7D0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "shards", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.26], spread: 34, gravity: 0.03,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xF2F7D0, alpha: [0.95, 0], light: "full", maxParticles: 48
                }
            ]
        },
        focus: {
            duration: 30,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "leak", bind: "target", offset: [0, 0.55, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xF2F7D0, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x9AB06A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skittersmack", 1, SkittersmackDefinition);

function skittersmackTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function skittersmackNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

// The final smack is a fixed arc at the real reach and smackWidth: the limb tip travels across the same wedge the server
// judged with, so the player reads what the swing actually covered. Nothing is spawned; it expires with the feedback effect.
WorldCombatClient.scene(SkittersmackSweepScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const origin = skittersmackTriple(data.point) || skittersmackTriple(entry.position);
    const dir = skittersmackTriple(data.direction);
    if (origin === null || dir === null) return;
    const radius = Math.max(0.4, skittersmackNumber(data.radius, 2.6));
    const span = Math.max(10, Math.min(180, skittersmackNumber(data.span, 76)));
    const back = skittersmackNumber(data.back, 0) > 0;
    const start = skittersmackNumber(data.start, frame.serverTick());
    const age = Math.max(0, frame.serverTick() - start);
    const progress = Math.max(0, Math.min(1, age / 16));
    const alpha = Math.round(200 * (1 - progress) * (1 - progress));
    if (alpha <= 6) return;
    const main = (alpha << 24 | (back ? 0xF2F7D0 : 0xA8C63A)) | 0;
    const edge = (Math.round(alpha * 0.85) << 24 | (back ? 0xFFFFFF : 0xC7D855)) | 0;
    const base = Math.atan2(dir[0], dir[2]), half = span * Math.PI / 360;
    const samples = Math.max(4, Math.round(span / 15));
    const px = [], pz = [];
    for (let i = 0; i <= samples; i++) {
        const angle = base - half + (2 * half) * i / samples;
        px.push(origin[0] + Math.sin(angle) * radius);
        pz.push(origin[2] + Math.cos(angle) * radius);
    }
    for (let i = 0; i < samples; i++) frame.line(px[i], origin[1] + 0.06, pz[i], px[i + 1], origin[1] + 0.06, pz[i + 1], main);
    frame.line(origin[0], origin[1] + 0.06, origin[2], px[0], origin[1] + 0.06, pz[0], edge);
    frame.line(origin[0], origin[1] + 0.06, origin[2], px[samples], origin[1] + 0.06, pz[samples], edge);
    // The limb tip sweeps from one edge to the other across the real opening, then the arc fades.
    const swing = Math.max(0, Math.min(1, age / 9)), angle = base - half + (2 * half) * swing;
    const tx = origin[0] + Math.sin(angle) * radius, tz = origin[2] + Math.cos(angle) * radius;
    frame.sprite(SkittersmackSlashSprite, tx, origin[1] + 0.12, tz, 0.7, 0, edge, 0, true);
    frame.sprite(SkittersmackCutSprite, tx, origin[1] + 0.12, tz, 0.5, 0, main, 0, true);
});
