/**
 * 十字剪 / xscissor 的客户端表现。
 *
 * 一句话：两片刃在身体左右张开 → 每刻按服务端当前真实子段画出两把刃，夹口可见地收窄、越线、交错成 X，
 *   命中处迸一记短闪 → 空剪只留一道收势的风。
 * 主体交给自定义场景 `world_combat:move_xscissor/blade`：只用真实世界端点画线/贴图，没有额外实体——
 *   左/右各一条当刻精确的握点→刀尖刃线，配贴图刃身与刀尖高光；端点就是服务端这一刻判定用的同一条刃段，
 *   撞墙后的刀尖已由服务端裁到接触点，画面不会越过墙面。粒子只在 blade_left／blade_right 留下极短余痕。
 * 色相家族：亮绿（0xB6D45A 左刃）与黄绿（0xC8E86A 右刃）＋近白高光（0xF6FFE4 cut）＋中性尘。
 * 拍子：起 windup（张臂集光）→ 合 blade_left／blade_right（逐刻两把真实刃，越线后自然成 X）→ clip（命中短闪）／ miss。
 * 数：`data.motes`（实际剪伤派生）绑定余痕量，`data.sparks`（命中剪伤派生）绑定短闪量，
 *   `data.intensity`（剪伤 / 40）抬高亮度，`data.scale`（夹口半宽 / 参考半宽）同步刃与粒子尺度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const XscissorBladeScene = "world_combat:move_xscissor/blade";
const XscissorSlashSprite = "cobblemon:particle/generic/slash";
const XscissorCutSprite = "cobblemon:particle/generic/cut";

const XscissorDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: { data: "windup", fallback: 7 }, drain: 10 },
            emitters: [
                {
                    name: "left_gather", bind: "source", offset: [{ data: "left.0", fallback: -0.45 }, 0.4, { data: "left.2", fallback: 0 }], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xA6D44E, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "right_gather", bind: "source", offset: [{ data: "right.0", fallback: 0.45 }, 0.4, { data: "right.2", fallback: 0 }], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xC8E86A, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        blade_left: {
            duration: 30,
            exit: { stop: 24, drain: 16 },
            emitters: [
                {
                    name: "left_tail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 10 }, direction: "shape", speed: [0.02, 0.08], spread: 6,
                    lifetime: [2, 4], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xB6D45A, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        blade_right: {
            duration: 30,
            exit: { stop: 24, drain: 16 },
            emitters: [
                {
                    name: "right_tail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 10 }, direction: "shape", speed: [0.02, 0.08], spread: 6,
                    lifetime: [2, 4], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xC8E86A, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        clip: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "clip_burst", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "sparks", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 20,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE2F2A8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 44
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x9AB06A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_xscissor", 1, XscissorDefinition);

/** A [x,y,z] triple from a payload vertex, or null when absent/malformed. */
function xscissorTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function xscissorNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

// Stable two-blade body: each frame draws the exact current edges the server judged with, so the closing jaw
// reads as two real blades crossing rather than a random cloud. Presented each tick by skill.ts under one key.
WorldCombatClient.scene(XscissorBladeScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const scale = Math.max(0.5, Math.min(2.2, xscissorNumber(data.scale, 1)));
    const intensity = Math.max(0.6, Math.min(2.4, xscissorNumber(data.intensity, 1)));
    const cut = xscissorNumber(data.cut, 40);
    const alpha = Math.round(Math.max(90, Math.min(235, 165 + intensity * 30)));
    const strands = Math.max(2, Math.min(6, Math.round(cut / 16)));

    function blade(ends: any, color: number, glint: number): void {
        const a = xscissorTriple(ends && ends[0]), b = xscissorTriple(ends && ends[1]);
        if (a === null || b === null) return;
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!(length > 1e-3)) return;
        const stroke = (alpha << 24 | color) | 0;
        const edge = (Math.round(alpha * 0.55) << 24 | color) | 0;
        // Precise edge plus two stable parallel strokes give a readable blade instead of a bare wireframe.
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], stroke);
        const hx = -dz / length, hz = dx / length, off = 0.06 * scale;
        frame.line(a[0] + hx * off, a[1], a[2] + hz * off, b[0] + hx * off, b[1], b[2] + hz * off, edge);
        frame.line(a[0] - hx * off, a[1], a[2] - hz * off, b[0] - hx * off, b[1], b[2] - hz * off, edge);
        // Broad glowing body along the same endpoints; a bright tooth at the tip.
        for (let i = 0; i < strands; i++) {
            const t = (i + 0.5) / strands;
            frame.sprite(XscissorSlashSprite, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t,
                0.34 * scale, 0, stroke, i % 5, true);
        }
        frame.sprite(XscissorCutSprite, b[0], b[1], b[2], 0.3 * scale, 0, (alpha << 24 | glint) | 0, 0, true);
    }

    blade(data.left, 0xB6D45A, 0xF6FFE4);
    blade(data.right, 0xC8E86A, 0xF6FFE4);
});
