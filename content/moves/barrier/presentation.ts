/**
 * 屏障 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者在身前聚起一排冷蓝的硬光板，光板一格一格从地表抽起、拼成半透明的墙，顶边泛着亮白辉光；
 *   持壁期间墙面微微流动，崩解时碎片向下坠去。
 *
 * 色相家族：冷蓝（0x9FC7FF）为主体，亮白（0xE8F3FF）做高光，深蓝（0x4E6FA8）做余韵；没有第二个色相。
 * 层次：向心聚拢的光尘（起）／墙面、顶边辉光、基座环、抽起的光柱（击）／墙面微光（收）／下坠碎片（末）。
 * 起击收：focus（聚板）→ raise（立墙）→ hold（持壁）→ shatter（崩解）。
 * 范围：墙面由与机制同一组顶点（`data.path` 四角）以 polygon 填满，画出来的面就是墙挡住的区域；
 *   基座环绑墙根点、fit none，半径按 `data.scale`（实际墙宽 / 2.4）推出。
 * 运动：光板沿 +Y 从地表抽起；墙面沿顶点撑开；碎片受重力落下。
 * 数：光板数绑 `data.panels`（特攻与等级派生），列数绑 `data.columns`，`data.scale` 同时放大整片宽度与粒子尺寸。
 * 持续状态：持壁期墙面低密度、半透明，放在身前、不遮住术者本体。
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
                    name: "raise_face", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "panels", fallback: 6 }, interval: 2, repeats: 2 },
                    shape: { kind: "polygon" },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.5, 0.82],
                    color: 0x9FC7FF, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "raise_edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "panels", fallback: 6 }, interval: 3, repeats: 2 },
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
                    shape: { kind: "line", length: 2.4 },
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
                    name: "hold_face", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    rate: 4, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.005, 0.02],
                    lifetime: [16, 26], size: [0.5, 0.5],
                    color: 0x9FC7FF, alpha: [0.18, 0], light: "world", maxParticles: 26
                },
                {
                    name: "hold_edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 3, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.008, 0.03],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE8F3FF, alpha: [0.4, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        shatter: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "shatter_flash", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    lifetime: [10, 12], size: [0.6, 1.0],
                    color: 0xE8F3FF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 4
                },
                {
                    name: "shatter_shards", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.92, spin: 18,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0x9FC7FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 56
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_barrier", 1, BarrierDefinition);
