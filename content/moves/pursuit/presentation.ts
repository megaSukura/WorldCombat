/**
 * 追打的表现：
 * 「施法者贴地扑出，每刻沿身体真实走过的子段拖出短痕与尘土；命中普通一扑炸开暗色碎片，
 *  目标正拉开距离时碎片更密更亮，并在真实接触点留下几道固定爪痕。」
 *
 * 色相家族：暗紫到近黑，白核作强调。
 * 拍子：起手 lunge（低身蓄势）→ 扑击 dash（逐刻真实子段）→ 命中 strike ／ 追击 catch（多一层爪痕）／
 *       阻挡 blocked（碰到身体但没造成伤害）→ 空扑 miss。
 * 范围：dash 的 path 就是身体这一 tick 真实走过的两端；catch 的爪痕按 data.at 与真实冲刺方向摆在接触点。
 * 数：命中碎片数量由服务端按最终威力算出的 data.count 决定，翻倍时更多。
 */
const PursuitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起手：贴地蓄势，脚下压出一圈尘；时长就是准备刻数，不再延续到后摇。
        lunge: {
            duration: { data: "windup", fallback: 4 },
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "crouch_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0x555555, alpha: [0.5, 0], gravity: 0.02, drag: 0.95,
                    light: "world", maxParticles: 40
                },
                {
                    name: "speedlines", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, direction: "velocity", speed: [0.0, 0.05],
                    lifetime: [8, 12], size: [0.3, 0.05],
                    color: 0x8A6AD0, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        // 扑击：服务端每刻把身体真实走过的子段端点放进 path，粒子沿当前这一段发射。
        dash: {
            emitters: [
                {
                    name: "dash_trail", bind: "path", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.0, 0.05], spread: 10,
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xB080FF, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "dash_dust", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 18, direction: "shape", speed: [0.02, 0.08], gravity: 0.02, drag: 0.95,
                    lifetime: [7, 12], size: [0.07, 0.02],
                    color: 0x555555, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // 空扑：扑到尽头没碰到任何人，尘与短痕原地散掉。
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff_dust", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x555555, alpha: [0.45, 0], light: "world", maxParticles: 32
                }
            ]
        },
        // 阻挡：碰到友方或被原生拒绝，只有一撮暗色尘，不冒充命中的碎片与浮字。
        blocked: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "blocked_dust", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0x555555, alpha: [0.5, 0], light: "world", maxParticles: 32
                }
            ]
        },
        // 命中：普通一扑。
        strike: {
            duration: 22,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "strike_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x9B7AD0, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "strike_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0x6A4AB0, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        // 命中（追击）：目标正在拉开距离，碎片更密、更亮；爪痕由自定义场景在接触点单独画出。
        catch: {
            duration: 26,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "catch_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.1, 0.3],
                    lifetime: [8, 15], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xC11BFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "catch_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.15, 0.4], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD8A0FF, alpha: [0.95, 0], light: "full", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pursuit", 1, PursuitDefinition);

/**
 * 接触爪痕：在真实碰点（`data.at`）按本招实际冲刺方向（`data.direction`）摆出固定数量的刮痕，
 * 每道一条短线和一枚斜贴图，几刻内淡出。只读载荷，不生成粒子或实体；不绕到背后、不暗示抓取。
 */
const PursuitMarkScene = "world_combat:move_pursuit/marks";
const PursuitClawTexture = "cobblemon:particle/generic/slash";
function pursuitMarkVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function pursuitMarkNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function pursuitMarkUnit(value: number[]): number[] {
    const length = Math.sqrt(value[0] * value[0] + value[1] * value[1] + value[2] * value[2]);
    return length > 1e-6 ? [value[0] / length, value[1] / length, value[2] / length] : [0, 0, 1];
}
function pursuitMarkCross(a: number[], b: number[]): number[] {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
WorldCombatClient.scene(PursuitMarkScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "marks") return;
    const at = pursuitMarkVector(data.at, [0, 0, 0]);
    const forward = pursuitMarkUnit(pursuitMarkVector(data.direction, [0, 0, 1]));
    let reference = [0, 1, 0];
    if (Math.abs(forward[0] * reference[0] + forward[1] * reference[1] + forward[2] * reference[2]) > 0.95) reference = [1, 0, 0];
    const right = pursuitMarkUnit(pursuitMarkCross(forward, reference)), up = pursuitMarkUnit(pursuitMarkCross(right, forward));
    const count = Math.max(1, Math.min(5, Math.round(pursuitMarkNumber(data.count, 3))));
    const scale = Math.max(0.6, Math.min(1.8, pursuitMarkNumber(data.scale, 1)));
    const age = Math.max(0, frame.serverTick() - pursuitMarkNumber(data.start, frame.serverTick()));
    const fade = age <= 4 ? 1 : Math.max(0, 1 - (age - 4) / 9);
    if (fade <= 0) return;
    const alpha = Math.round(230 * fade);
    const gap = 0.15 * scale, halfLength = 0.34 * scale;
    for (let i = 0; i < count; i++) {
        const along = (i - (count - 1) / 2) * gap;
        const cx = at[0] + right[0] * along, cy = at[1] + right[1] * along, cz = at[2] + right[2] * along;
        // 每道刮痕略微朝冲刺方向倾斜，读作从冲刺方向划过接触面。
        const x0 = cx - up[0] * halfLength + forward[0] * 0.05 * scale;
        const y0 = cy - up[1] * halfLength + forward[1] * 0.05 * scale;
        const z0 = cz - up[2] * halfLength + forward[2] * 0.05 * scale;
        const x1 = cx + up[0] * halfLength - forward[0] * 0.03 * scale;
        const y1 = cy + up[1] * halfLength - forward[1] * 0.03 * scale;
        const z1 = cz + up[2] * halfLength - forward[2] * 0.03 * scale;
        frame.line(x0, y0, z0, x1, y1, z1, (alpha << 24 | 0xC11BFF) | 0);
        frame.sprite(PursuitClawTexture, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, halfLength * 2,
            (i - (count - 1) / 2) * 18, (alpha << 24 | 0x9B7AD0) | 0, i % 5, true);
    }
});
