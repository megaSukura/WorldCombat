/**
 * 聚气 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低下头深深吸一口气，一圈圈偏冷的静气从脚边收拢、再随呼吸向外推开；这口气越沉，贴身的静念
 *   越亮越大；收功时静气轻轻上浮散尽。
 *
 * 色相家族：冷青（0x9FD8FF）为主体，近白（0xE8FBFF）做高光与静环；没有第二个色相。
 * 层次：吸气（起手，光点向里收）／静定（静环与念力向外推）／持气（越深越亮，低密度贴脚）／散开（末）。
 * 起击收：inhale（吸气）→ settle（静定）→ deepen（持气，随深化变亮）→ fade（散）。
 * 范围：静环绑脚点、fit none，半径按 `data.scale`（实际静念半径 / 1.4）推出，画出来的圈就是静气铺到的范围。
 * 运动：吸气时光点向里收；静定与持气时静环一圈圈向外推开、念力贴着身体缓慢上浮；散开时向上飘散。
 * 数：念力量绑 `data.motes`（特攻与物攻派生），静环圈数绑 `data.breaths`（等级派生），
 *   静环的亮度与尺寸绑 `data.ratio`（服务端算出的已深化比例），整体尺度绑 `data.scale`。
 * 持续状态：持气期低密度、贴近脚边与身体，玩家仍看得清目标。
 */
const FocusEnergyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "inhale_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 16, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.92, spin: 10,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9FD8FF, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 44
                },
                {
                    name: "inhale_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "breaths", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 16], size: [0.3, 0.55], sizeMode: "index",
                    color: 0xE8FBFF, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        settle: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "settle_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 20 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.15], gravity: -0.002, drag: 0.92, spin: 14,
                    lifetime: [12, 22], size: [0.11, 0.03],
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 200
                },
                {
                    name: "settle_ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "breaths", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [16, 26], size: [0.5, 0.95], sizeMode: "index",
                    color: 0xE8FBFF, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "settle_dust", bind: "source", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0x9FD8FF, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        deepen: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "deepen_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [14, 22], size: [0.36, 0.72], sizeMode: "sin",
                    color: 0xE8FBFF, alpha: [0.45, 0], light: "full", maxParticles: 26
                },
                {
                    name: "deepen_mote", bind: "source", fit: "none", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04], spin: 8,
                    lifetime: [16, 26], size: [0.07, 0.01],
                    color: 0x9FD8FF, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 44
                },
                {
                    name: "deepen_core", bind: "source", fit: "none", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 5, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [12, 20], size: [0.12, 0.04], alpha: [0.5, 0],
                    color: 0xE8FBFF, light: "full", bloom: 0.3, maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_mote", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0x9FD8FF, alpha: [0.4, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.24, 0.06],
                    color: 0xE8FBFF, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_focusenergy", 1, FocusEnergyDefinition);
