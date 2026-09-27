/**
 * 大闹一番 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者踏地抡起双臂，一片琥珀色的臂风沿扫过去的扇面贴地荡开；被扫到的人朝外掀出去，
 *   最后一记重跺震起一圈尘土；闹完自己头顶转起眩晕的气流。
 * 色相家族：琥珀 0xC9A227 与近白 0xFFF0C0 为主，低饱和土黄 0x8A7A50 只做尘土与余韵；一个色相。
 * 层次：踏步蓄势（tempo）→ 左右扇扫（sweep 自定义场景）→ 命中外掀（knock）→ 重跺（stomp）／踏空（whiff）→ 磕伤（reckless）→ 收束眩晕（spent）→ 持续眩晕（dizzy）。
 * 范围：sweep 不再填满整片扇面；`world_combat:move_thrash_sweep` 自定义场景按 `data.path` 的弧顶点让一条手臂代理
 *   逐帧从一侧扫到另一侧（`data.start`／`data.duration` 定时），判定用的同一组 server 弧顶点与手臂共用，扫过的那一侧才亮。
 * 运动：手臂代理与尘土沿弧从一侧扫到另一侧；命中处再朝外炸一撮土；重跺向上掀起，踏空只落一撮空尘。
 * 数：服务端把 `data.dust`（尘土数）、`data.intensity`（威力）与 `data.scale`（乱挥半径）交给发射器与手臂代理，数量和强度按机制走。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ThrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stomp_prep", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0x8A7A50, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "arm_wind", bind: "source", offset: [0, 0.9, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFF0C0, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        whiff: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 } }, shape: { kind: "ring", radius: 0.5 },
                    direction: "down", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8A7A50, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        },
        knock: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "knock_dust", bind: "target", offset: [0, 0.15, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.12, 0.01],
                    color: 0x8A7A50, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        stomp: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shock", bind: "source", offset: [0, 0.12, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, interval: 6 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.88,
                    lifetime: [12, 22], size: [1.2, 0.1], sizeMode: "sin",
                    color: 0xC9A227, alpha: [0.6, 0], light: "world", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "stomp_dust", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 }, repeats: 3, interval: 3 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.12, 0.32],
                    lifetime: [12, 22], size: [0.12, 0.01],
                    color: 0x8A7A50, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        reckless: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "chip", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dizzy", bind: "source", offset: [0, 1.1, 0], height: 0.2, fit: "body", spin: 12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 10, repeats: 2, interval: 8 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        punish: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dizzy: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "dizzy_loop", bind: "source", offset: [0, 1.1, 0], height: 0.15, fit: "body", spin: 9,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.18, 0.05],
                    alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thrash", 1, ThrashDefinition);

/**
 * 大闹一番的真实手臂代理：服务端每记扇扫给出与判定共用的那组弧顶点（data.path，path[0] 是弧心）、扫过方向与起始刻，
 * 这里让一条手臂从弧的一端逐帧扫到另一端，并在弧上抖出土。固定顶点与固定数量，扫过的那一侧才亮，不再填满整片扇面。
 */
const ThrashSweepSoftswipe = "cobblemon:particle/generic/softswipe";
const ThrashSweepDust = "cobblemon:particle/generic/tinydust";

function thrashSweepNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function thrashSweepVec(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && value.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback.slice();
}
function thrashSweepPoints(value: any): number[][] {
    if (!Array.isArray(value)) return [];
    const points: number[][] = [];
    for (let i = 0; i < value.length; i++) {
        const point = value[i];
        if (Array.isArray(point) && point.length === 3 && point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            points.push([Number(point[0]), Number(point[1]), Number(point[2])]);
    }
    return points;
}

WorldCombatClient.scene("world_combat:move_thrash_sweep", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = thrashSweepPoints(data.path);
    if (path.length < 3) return;
    const centre = path[0], arc = path.slice(1);
    const duration = Math.max(1, thrashSweepNumber(data.duration, 20));
    const start = thrashSweepNumber(data.start, frame.serverTick() - duration * 0.5);
    const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const scale = Math.max(0.6, Math.min(2.2, thrashSweepNumber(data.scale, 1)));
    const intensity = Math.max(0.4, Math.min(2.6, thrashSweepNumber(data.intensity, 1)));
    const dust = Math.max(4, Math.min(40, thrashSweepNumber(data.dust, 12)));
    // 手臂外端沿弧顶点插值：progress 从 0 到 1 扫过整条弧。
    const at = progress * (arc.length - 1), low = Math.floor(at), high = Math.min(arc.length - 1, low + 1), f = at - low;
    const a = arc[low], b = arc[high];
    const tip = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    // 手臂基点跟随施法者当刻身体（踉跄也在动）；取不到就用弧心。
    const base = thrashSweepVec(centre, centre);
    const anchorText = frame.anchor(entry.source);
    if (anchorText) {
        const anchor: any = JSON.parse(anchorText);
        if (anchor) base[1] = anchor.y + 0.6 * (typeof anchor.height === "number" && anchor.height > 0 ? anchor.height / 1.4 : 1);
    }
    const alpha = Math.max(0, Math.min(255, Math.round((0.35 + 0.5 * Math.sin(progress * Math.PI)) * Math.min(1.4, intensity) * 255)));
    const colour = (alpha << 24 | 0xFFF0C0) | 0;
    const beads = Math.max(2, Math.min(6, Math.round(dust / 5)));
    for (let i = 0; i < beads; i++) {
        const t = beads <= 1 ? 1 : i / (beads - 1);
        frame.sprite(ThrashSweepSoftswipe,
            base[0] + (tip[0] - base[0]) * t, base[1] + (tip[1] - base[1]) * t + 0.1 * (1 - t), base[2] + (tip[2] - base[2]) * t,
            (0.28 - 0.1 * t) * scale, (progress * 360) % 360, colour, Math.floor(frame.serverTick() / 2 + i) % 8, true);
    }
    const puffs = Math.max(2, Math.min(10, Math.round(dust / 3)));
    for (let i = 0; i < puffs; i++) {
        const wobble = Math.sin(frame.serverTick() * 0.5 + i) * 0.18;
        const along = Math.max(0, Math.min(1, progress - i * 0.06));
        const px = centre[0] + (tip[0] - centre[0]) * along + wobble;
        const pz = centre[2] + (tip[2] - centre[2]) * along - wobble;
        frame.sprite(ThrashSweepDust, px, centre[1] - 0.35 + 0.05 * i, pz,
            0.12 + 0.04 * (i % 3), 0, ((0x70 << 24) | 0x8A7A50) | 0, Math.floor(frame.serverTick() / 3 + i) % 2, false);
    }
});
