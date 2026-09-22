/**
 * 诡计 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者盯着对手，一圈暗紫的思绪从四面收进头顶，越盘越密，随后炸开成一圈圈暗念；
 *   这条毒计在它周身以低密度暗点盘着，散计时暗念沉下去淡掉。
 *
 * 色相家族：暗紫（0x6A3FA0）为主体，亮紫（0xC9A6FF）做高光与暗环，深紫（0x3A2456）做余韵；没有第二个色相。
 * 层次：起念（起）／思绪、暗环与暗点（击）／贴身的低密度暗念（收）／沉落（末）。
 * 起击收：plot（盘算）→ surge（成计）→ sustain（维持）→ fade（散计）。
 * 范围：暗环绑脚点、fit none，半径按 `data.scale`（实际暗念半径 / 1.4）推出，画出来的圈就是暗念铺到的范围。
 * 运动：思绪由外向内收拢到头顶；暗环一拍拍向外推开；维持时暗点贴着身体缓慢上浮。
 * 数：思绪量绑 `data.motes`（特攻＋速度派生），暗环圈数绑 `data.beats`（等级派生），尺寸与范围绑 `data.scale`（体型派生）。
 * 持续状态：维持期低密度、贴身，玩家仍看得清目标。
 */
const NastyPlotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        plot: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "plot_thought", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 14, shape: { kind: "sphere", radius: 1.5 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.9, spin: 18,
                    lifetime: [9, 16], size: [0.07, 0.02],
                    color: 0x6A3FA0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "plot_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 5 }, shape: { kind: "ring", radius: 1.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.3, 0.6], sizeMode: "index",
                    color: 0xC9A6FF, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        },
        surge: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "surge_thought", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    burst: { count: { data: "motes", fallback: 20 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.18], gravity: -0.002, drag: 0.92, spin: 24,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x6A3FA0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 220
                },
                {
                    name: "surge_spark", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 1.0 },
                    direction: "outward", speed: [0.06, 0.22], drag: 0.9, spin: 20,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC9A6FF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "surge_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "beats", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [16, 26], size: [0.5, 0.95], sizeMode: "index",
                    color: 0x3A2456, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        sustain: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "sustain_thought", bind: "source", fit: "none", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 3, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.03], spin: 10,
                    lifetime: [14, 24], size: [0.07, 0.015],
                    color: 0x6A3FA0, alpha: [0.3, 0], light: "full", bloom: 0.25, maxParticles: 18
                },
                {
                    name: "sustain_orb", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 2, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xC9A6FF, alpha: [0.26, 0], light: "world", maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_thought", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.02, 0.07], gravity: 0.03, drag: 0.9, spin: 10,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x3A2456, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nastyplot", 1, NastyPlotDefinition);
