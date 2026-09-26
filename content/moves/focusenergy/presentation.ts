/**
 * 聚气 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低下头深深吸一口气，一圈圈偏冷的静气从脚边收拢；随后胸前一枚光点随这口气越沉越亮，
 *   满气的一刻轻轻一闪，往后每次落地出招都带一缕贴身的轻量气息，收功时静气上浮散尽。
 *
 * 色相家族：冷青（0x9FD8FF）为主体，近白（0xE8FBFF）做高光与静环；没有第二个色相。
 * 层次：吸气（起手，光点向里收）／静定（静环与念力向外推）／持气（胸前光点随比例亮起，低密度贴脚）／
 *   满气（一闪）／出招（落地时一缕轻量气息）／散开（末）。
 * 起击收：inhale（吸气）→ settle（静定）→ deepen（持气，随深化变亮，同一实例）→ full（满气闪）→ pulse（落地气息）→ fade（散）。
 * 范围：静环绑脚点、fit none，半径按 `data.scale`（实际静念半径 / 1.4）推出，画出来的圈就是静气铺到的范围。
 * 运动：吸气时光点向里收；静定与持气时静环一圈圈向外推开、念力贴着身体缓慢上浮；散开时向上飘散。
 * 数：念力量绑 `data.motes`（特攻与物攻派生），静环圈数绑 `data.breaths`（等级派生），
 *   胸前光点的尺寸与亮度绑 `data.coreSize` / `data.coreAlpha`（服务端按真实 ratio 算出），出招气息绑 `data.ratio`。
 * 持续状态：持气期低密度、贴近脚边与胸前，玩家仍看得清目标；满气后维持轻量恒定，不再堆叠。
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
                    name: "breath_core", bind: "source", fit: "body", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.004, 0.012], drag: 0.95,
                    lifetime: [10, 16], size: [{ data: "coreSize", fallback: 0.08 }, 0.02],
                    color: 0xE8FBFF, alpha: [{ data: "coreAlpha", fallback: 0.3 }, 0],
                    light: "full", bloom: 0.4, maxParticles: 10
                },
                {
                    name: "deepen_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 4, shape: { kind: "ring", radius: 1.1 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [14, 22], size: [0.3, 0.62], sizeMode: "sin",
                    color: 0xE8FBFF, alpha: [0.4, 0], light: "full", maxParticles: 20
                },
                {
                    name: "deepen_mote", bind: "source", fit: "none", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04], spin: 8,
                    lifetime: [16, 26], size: [0.06, 0.01],
                    color: 0x9FD8FF, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 30
                }
            ]
        },
        full: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "full_burst", bind: "source", fit: "body", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9, spin: 12,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xE8FBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "full_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.4, 0.12],
                    color: 0x9FD8FF, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        pulse: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "pulse_breath", bind: "source", fit: "body", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 8 } }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92, spin: 8,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9FD8FF, alpha: [0.5, 0], light: "full", maxParticles: 18
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
