/**
 * 诡计 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把心思一点点盘到头顶，短促的思绪跳点从四面收拢成一个亮点；真正把特攻抬上去的那刻只亮一次，
 *   此后头顶只留一枚极轻的标识，绝不铺开大范围舞台圈，窗口结束或被清除时标识同步散去。
 *
 * 色相家族：暗紫（0x6A3FA0）为主体，亮紫（0xC9A6FF/0xE6D4FF）做亮点与高光，深紫（0x3A2456）做余韵；没有第二个色相。
 * 层次：盘算（起，短促跳点）／成计（击，亮点只亮一次）／标识（收，极轻）／散计（末）。
 * 起击收：plot（盘算）→ spark（亮点落定）或 capped（已满不亮）→ mark（轻量标识）→ fade（散计）。
 * 范围：plot 贴在头顶小范围收拢；spark／mark 也用 `data.scale`（实际标识半径 / 0.5）推出尺寸，跟真实标识一起变。
 * 运动：思绪由外向内汇到一个点；亮点落定时向外轻炸一圈；标识期几乎静止，只缓慢上浮。
 * 数：亮点量由 `data.charge`（有实际增量时才非零）驱动，余环数由 `data.beats`（等级派生）驱动；
 *   mark 密度由 `data.motes`（特攻＋速度派生）驱动。
 * 持续状态：标识绑在载体窗口效果上，随窗口自然到期、刷新或提前清除一起收。
 */
const NastyPlotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        plot: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "plot_mote", bind: "source", fit: "body", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 18,
                    lifetime: [7, 12], size: [0.06, 0.015],
                    color: 0x6A3FA0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "plot_glint", bind: "source", fit: "body", height: 0.74,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 2, interval: 5 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 10], size: [0.05, 0.01],
                    color: 0xC9A6FF, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 10
                }
            ]
        },
        spark: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spark_point", bind: "source", fit: "body", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "charge", fallback: 0 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE6D4FF, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 140
                },
                {
                    name: "spark_ring", bind: "source", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "beats", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.22, 0.45], sizeMode: "index",
                    color: 0x9B6BD6, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        capped: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "capped_dim", bind: "source", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.015, 0.05], gravity: 0.02, drag: 0.9, spin: 8,
                    lifetime: [8, 12], size: [0.04, 0.008],
                    color: 0x3A2456, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        mark: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "mark_glyph", bind: "source", fit: "body", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 2, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.006, 0.016], spin: 8,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xC9A6FF, alpha: [0.24, 0], light: "full", bloom: 0.25, maxParticles: 10
                },
                {
                    name: "mark_mote", bind: "source", fit: "body", height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 1.4, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.004, 0.012],
                    lifetime: [10, 16], size: [0.04, 0.008],
                    color: 0x6A3FA0, alpha: [0.18, 0], light: "world", maxParticles: 8
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_thought", bind: "source", fit: "body", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.07], gravity: 0.03, drag: 0.9, spin: 10,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x3A2456, alpha: [0.5, 0], light: "world", maxParticles: 32
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nastyplot", 1, NastyPlotDefinition);
