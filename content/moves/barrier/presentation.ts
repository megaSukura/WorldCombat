/**
 * 屏障 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者在点选的落点上聚起冷蓝的硬光板，光板一列列从地表抽起、拼成一面半透明的墙，顶边泛着亮白辉光；
 *   持壁期间墙顶边缘低密度流动，最后一格消失时整面碎散。
 *
 * 色相家族：冷蓝（0x9FC7FF）为主体，亮白（0xE8F3FF）做高光，深蓝（0x4E6FA8）做余韵；没有第二个色相。
 * 层次：向心聚拢的光尘（起）／墙面、顶边辉光、基座环、抽起的光柱（击）／墙顶微光（收）／下坠碎片（末）。
 * 起击收：focus（聚板）→ raise（立墙）→ hold（持壁）→ shatter（崩解）／fizzle（没立起来）。
 * 范围：墙面不再按理想矩形铺满——粒子沿 `data.path`（每个真实立起列的顶边折线）在边线上采样，
 *   被跳过或被破坏的列没有顶点，缺口就是真实缺口；基座环绑墙根点、fit none，半径按 `data.scale`（实际墙宽 / 2.4）推出。
 * 逐格描边：`world_combat:move_barrier_wall` 回调读服务端实际放下的格子（`data.cells`），只给每列最高的一格画顶面方框，
 *   空格自然留白；绑在墙的托管效果上（WorldFeedback.onEffect），随墙自然到期、被驱散或最后一格消失一起收。
 * 运动：光板沿 +Y 从地表抽起；墙面沿顶点撑开；碎片受重力落下。
 * 数：顶边粒子数绑 `data.placed`（原生 terrainResult 真正放下的格数），列数绑 `data.columns`，`data.scale` 放大粒子尺寸。
 */
const BarrierDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        focus: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "focus_mote", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 12, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.09], drag: 0.92, spin: 20,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9FC7FF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        raise: {
            duration: 48,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "raise_face", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "placed", fallback: 6 }, interval: 2, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.4, 0.7],
                    color: 0x9FC7FF, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "raise_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "placed", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xE8F3FF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 64
                },
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.5, 0.9], sizeMode: "index",
                    color: 0x4E6FA8, alpha: [0.65, 0], light: "world", maxParticles: 24
                },
                {
                    name: "raise_beam", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 16 },
                    shape: { kind: "line", length: { data: "height", fallback: 2 } },
                    direction: "up", speed: [0.08, 0.24], drag: 0.88,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x9FC7FF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 48
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "hold_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "panels", fallback: 6 }, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.008, 0.03],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE8F3FF, alpha: [0.4, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "hold_face", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 3, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.4, 0.4],
                    color: 0x9FC7FF, alpha: [0.16, 0], light: "world", maxParticles: 20
                }
            ]
        },
        shatter: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "shatter_flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    lifetime: [10, 12], size: [0.6, 1.0],
                    color: 0xE8F3FF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 4
                },
                {
                    name: "shatter_shards", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "placed", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92, spin: 18,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0x9FC7FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 56
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_mote", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "panels", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9FC7FF, alpha: [0.4, 0], light: "world", maxParticles: 18
                },
                {
                    name: "fizzle_smoke", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0x4E6FA8, alpha: [0.3, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_barrier", 1, BarrierDefinition);

// 逐格描边：只给每个真实立起列的最高一格画顶面方框——画出来的是实际放下的玻璃边缘，缺格自然留白。
// 数据来自服务端 `terrainResult` 真正放下的格子；绑定在墙的托管效果上，墙消失时一起收。
WorldCombatClient.scene("world_combat:move_barrier_wall", 1, function (frame) {
    const entry: CombatSceneEntry<{ cells: number[][]; columns: number; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const cells = entry.data.cells || [];
    const present: { [key: string]: boolean } = Object.create(null);
    for (let i = 0; i < cells.length; i++) present[cells[i][0] + "," + cells[i][1] + "," + cells[i][2]] = true;
    const color = 0xAA9FC7FF;
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (present[cell[0] + "," + (cell[1] + 1) + "," + cell[2]]) continue;
        const x = cell[0], y = cell[1] + 1, z = cell[2];
        frame.line(x, y, z, x + 1, y, z, color);
        frame.line(x + 1, y, z, x + 1, y, z + 1, color);
        frame.line(x + 1, y, z + 1, x, y, z + 1, color);
        frame.line(x, y, z + 1, x, y, z, color);
    }
});
