/**
 * 巨龙威能 / dragonenergy 的客户端表现。
 *
 * 一句话：一缕缕生命光沿瞄准方向从身上汇到身前的龙首 → 一道有厚度的龙息锥沿同一朝向冲出去，
 *   锥里的人各自炸开龙属冲击 → 龙息收成几缕残光散去；献祭式下抽血的那一下另有一层从身体被拔出的暗紫光。
 * 色相家族：龙属的紫紫红一族（0xB06AE8 主体、0xC98CF0 生命光、0xE86AC8 只在抽血层），近白只做龙首核心。
 * 拍子：汇（charge 汇光，沿 data.direction）→ 抽（drain，仅献祭式）→ 喷（breath 正向锥、hit 命中、自定义
 *   场景 move_dragonenergy_beam 画可达分束）→ 散（fade 起点收拢的残光，不再拖出暗示持续命中的长尾）。
 * 范围：breath 用与服务端 3D 锥同一组 `data.direction`／`data.length`／`data.half`、`fit:"world"` 与同一
 *   `data.point` 起点撑起 cone_volume，长度就是判定用的真实锥长，不再被 data.scale 二次放大。
 *   墙的遮挡由自定义场景承载：服务端把中轴与锥缘射线逐束截到真实墙面（WorldGeometry.blockHit），
 *   客户端沿这些可达分束画线和光点，所以墙后的锥面同样截断。
 * 运动：生命光在起手时沿 `data.direction` 汇入身前，龙息锥沿同一朝向整片推出。
 * 数：`data.focus`（特攻派生的生命光条数）决定锥面与汇光的密度，`data.length`（真实可达锥长）
 *   决定粒子尺寸与锥面尺度，`data.draw`（实际抽血量派生）决定抽血层数量，`data.count`（命中数）与
 *   `data.intensity`（威力派生）抬高命中亮度。
 */
const DragonenergyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "charge", fallback: 16 },
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "life_stream", bind: "source", offset: [0, 0.05, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "focus", fallback: 24 }, shape: { kind: "line", length: 1.2 },
                    orient: "direction", direction: "inward", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xC98CF0, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "head", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: { data: "focus", fallback: 18 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12], spin: 12,
                    lifetime: [8, 15], size: [0.14, 0.02],
                    color: 0xB06AE8, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "body_aura", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0xC98CF0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "blood_pull", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "draw", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.06, 0.24], spread: 20,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0xE86AC8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        breath: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cone_fill", bind: "point", offset: [0, 0, 0], height: 0, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "focus", fallback: 30 }, at: 0 }, amount: 1,
                    shape: { kind: "cone_volume", radius: 0.45, length: { data: "length", fallback: 8 }, angleDegrees: { data: "half", fallback: 21 } },
                    direction: "shape", speed: [0.06, 0.24], spread: 20, spin: 10,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xB06AE8, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "cone_edge", bind: "point", offset: [0, 0, 0], height: 0, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: { data: "focus", fallback: 30 }, amount: 1,
                    shape: { kind: "cone_volume", radius: 0.9, length: { data: "length", fallback: 8 }, angleDegrees: { data: "half", fallback: 21 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 16,
                    lifetime: [4, 9], size: [0.24, 0.06], sizeMode: "index",
                    color: 0xE6CCFF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "core_beam", bind: "point", offset: [0, 0, 0], height: 0, fit: "world", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smallbeam_cyan",
                    rate: { data: "focus", fallback: 24 }, shape: { kind: "line", length: { data: "length", fallback: 8 } },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.3, 0.08],
                    color: 0xB06AE8, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "dragon_impact", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "count", fallback: 12 }, at: 1, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20, spin: 10,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xE6CCFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "dragon_motes", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xC98CF0, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { drain: 16 },
            emitters: [
                {
                    name: "residual", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "focus", fallback: 14 }, at: 1 }, amount: 1,
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xC98CF0, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonenergy", 1, DragonenergyDefinition);

const DragonenergyBeamCore = "cobblemon:particle/generic/sparkle/mediumsparkle";
const DragonenergyBeamEdge = "cobblemon:particle/generic/orb/xsfadeorblite";

function dragonenergyBeamNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function dragonenergyBeamVec(value: any): number[] | null {
    return Array.isArray(value) && value.length === 3 && (value as any[]).every(n => typeof n === "number" && isFinite(n))
        ? [Number(value[0]), Number(value[1]), Number(value[2])] : null;
}
function dragonenergyBeamColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

/**
 * 可达分束主体（自定义客户端场景，不生成粒子或实体）：服务端传回中轴与锥缘若干射线各自截墙后的真实
 * 起止点（`data.paths`），这里逐束画一条轴线和沿线光点，按 `data.life` 淡出。墙后的锥面因此同样截断，
 * 与判定用的同一组几何同源；整束只出现一次，不承担命中。
 */
WorldCombatClient.scene("world_combat:move_dragonenergy_beam", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const paths = data.paths;
    if (!Array.isArray(paths) || paths.length === 0) return;
    const intensity = Math.max(0.4, Math.min(2.6, dragonenergyBeamNumber(data.intensity, 1)));
    const focus = Math.max(6, Math.min(80, dragonenergyBeamNumber(data.focus, 24)));
    const life = Math.max(1, dragonenergyBeamNumber(data.life, 22));
    const now = frame.serverTick();
    const age = Math.max(0, now - dragonenergyBeamNumber(data.start, now));
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    const size = 0.14 + 0.06 * intensity;
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        if (!Array.isArray(path) || path.length < 2) continue;
        const a = dragonenergyBeamVec(path[0]), b = dragonenergyBeamVec(path[path.length - 1]);
        if (!a || !b) continue;
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], dragonenergyBeamColour(0.7 * fade, 0xE6CCFF));
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const steps = Math.max(2, Math.min(14, Math.round(length * 0.5) + Math.floor(focus / 12) + 1));
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const jitter = Math.sin((now + i * 13) * 0.9 + s * 2.3) * 0.03 * fade;
            frame.sprite(i === 0 ? DragonenergyBeamCore : DragonenergyBeamEdge,
                a[0] + dx * t + jitter, a[1] + dy * t, a[2] + dz * t + jitter,
                size * (0.7 + 0.3 * Math.sin(Math.PI * t)),
                Math.round((i * 37 + s * 53) % 360),
                dragonenergyBeamColour((0.6 - 0.35 * t) * fade, i === 0 ? 0xE6CCFF : 0xB06AE8), 0, true);
        }
    }
});
