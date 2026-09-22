/**
 * 点穴 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者探手按到目标身上的一处穴道，一簇金色火花从穴道炸开，一圈暖光滑下去；
 *   经络里留下一线琥珀色的流光沿身侧缓慢上浮，通完自行沉落。
 *
 * 色相家族：琥珀金（0xE8B45A）为主体，暖白（0xFFE3A0）做高光与指压，深褐（0x8A5A22）做余韵；没有第二个色相。
 * 层次：探手（起）／指压与火花、光溜（击）／贴身的流光（收）／沉落（末）。
 * 起击收：seek（探手）→ press（落指）／flow（通畅）→ fade（沉落）。
 * 范围：光溜绑目标脚边、fit body，半径按 `data.scale`（实际点穴距离 / 2.0）推出，画出来的圈就是这一按够到的范围。
 * 运动：火花从穴道向外炸开、光溜向下滑一圈；流光贴着身体缓慢上浮；沉落时火星下坠。
 * 数：火花量绑 `data.motes`（速度派生），光溜圈数绑 `data.beats`（等级派生），尺寸与半径绑 `data.scale`（体型派生）；
 *   `data.stat` 只由服务端用于选哪一条浮字，画面不另起色相。
 * 持续状态：流畅期低密度、贴身，玩家仍看得清目标。
 */
const AcupressureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        seek: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "seek_spark", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 14, shape: { kind: "sphere", radius: 0.7 },
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
                    name: "press_hit", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.06], spin: 16,
                    lifetime: [8, 14], size: [0.28, 0.12],
                    color: 0xFFE3A0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 24
                },
                {
                    name: "press_spark", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.004, drag: 0.9, spin: 24,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xE8B45A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "press_ring", bind: "target", fit: "body", offset: [0, -0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "beats", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.35, 0.7], sizeMode: "index",
                    color: 0x8A5A22, alpha: [0.55, 0], light: "world", maxParticles: 20
                }
            ]
        },
        flow: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "flow_orb", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 3, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.03], spin: 8,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE8B45A, alpha: [0.3, 0], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    name: "flow_spark", bind: "target", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.006, 0.018],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xFFE3A0, alpha: [0.24, 0], light: "world", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_spark", bind: "target", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.015, 0.05], gravity: 0.03, drag: 0.92, spin: 10,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x8A5A22, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acupressure", 1, AcupressureDefinition);
