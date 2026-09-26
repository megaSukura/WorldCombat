/**
 * 点穴 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者近身探手按到目标身上的一处穴道，那一处短闪一簇火花，随后只在那个穴道上留一点微光；
 *   按中哪项能力，亮点就落在哪处固定穴点（由 `data.ax/ay/az` 给出），不再绕全身持续乱光。
 *
 * 色相家族：琥珀金（0xE8B45A）为主体，暖白（0xFFE3A0）做高光与指压，深褐（0x8A5A22）做余韵；没有第二个色相。
 * 层次：探手（起）／穴点指压与火花（击）／穴点微光（收）／沉落（末）。
 * 起击收：seek（探手）→ press（落指）／flow（通畅）→ fade（沉落）。
 * 范围：穴点绑目标身份、fit body，偏移由 `data.ax/ay/az`（服务器按抽中项算出的固定穴点）读取，随目标体型缩放；
 *   整体强度按 `data.scale`（实际点穴距离 / 2.0）推出。
 * 运动：探手时小点向目标收；落指只在穴点炸开一小簇；通畅期穴点微光缓慢上浮；沉落时火星下坠。
 * 数：火花量绑 `data.motes`（速度派生），穴点小环数绑 `data.beats`（等级派生）；`data.stat` 供服务端选浮字，画面不另起色相。
 * 持续状态：穴点微光绑在载体窗口效果上，随窗口自然到期、刷新或提前清除一起收。
 */
const AcupressureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        seek: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "seek_spark", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.9, spin: 20,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xFFE3A0, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        press: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "press_hit", bind: "target", fit: "body", height: 0,
                    offset: [{ data: "ax", fallback: 0 }, { data: "ay", fallback: 0.5 }, { data: "az", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.06], spin: 16,
                    lifetime: [8, 14], size: [0.22, 0.1],
                    color: 0xFFE3A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 12
                },
                {
                    name: "press_spark", bind: "target", fit: "body", height: 0,
                    offset: [{ data: "ax", fallback: 0 }, { data: "ay", fallback: 0.5 }, { data: "az", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.004, drag: 0.9, spin: 24,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xE8B45A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "press_ring", bind: "target", fit: "body", height: 0,
                    offset: [{ data: "ax", fallback: 0 }, { data: "ay", fallback: 0.5 }, { data: "az", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "beats", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.22, 0.44], sizeMode: "index",
                    color: 0x8A5A22, alpha: [0.55, 0], light: "world", maxParticles: 16
                }
            ]
        },
        flow: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "flow_point", bind: "target", fit: "body", height: 0,
                    offset: [{ data: "ax", fallback: 0 }, { data: "ay", fallback: 0.5 }, { data: "az", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 2, shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.008, 0.02], spin: 8,
                    lifetime: [12, 20], size: [0.06, 0.015],
                    color: 0xE8B45A, alpha: [0.28, 0], light: "full", bloom: 0.25, maxParticles: 10
                },
                {
                    name: "flow_mote", bind: "target", fit: "body", height: 0,
                    offset: [{ data: "ax", fallback: 0 }, { data: "ay", fallback: 0.5 }, { data: "az", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 1.4, shape: { kind: "sphere", radius: 0.12 },
                    direction: "up", speed: [0.005, 0.014],
                    lifetime: [12, 20], size: [0.045, 0.01],
                    color: 0xFFE3A0, alpha: [0.2, 0], light: "world", maxParticles: 8
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_spark", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.015, 0.05], gravity: 0.03, drag: 0.92, spin: 10,
                    lifetime: [12, 20], size: [0.055, 0.01],
                    color: 0x8A5A22, alpha: [0.45, 0], light: "world", maxParticles: 32
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acupressure", 1, AcupressureDefinition);
