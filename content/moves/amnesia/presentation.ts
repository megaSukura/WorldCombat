/**
 * 瞬间失忆 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把缠在头上的杂念一点点散掉，清掉几项就碎几片；随后身上只留一层轻薄得几乎看不见的空白光晕，
 *   回神时残尘落定。
 *
 * 色相家族：近白（0xDCEBFF）为主体，纯白（0xFFFFFF）做空环与高光，灰蓝（0x9FB4D0）做尘与余韵；没有第二个色相。
 * 层次：散念（起，头顶杂念点）／空明盾感与碎念（击）／轻光晕（收）／落定（末）。
 * 起击收：release（散念）→ blank（空明）→ sustain（轻光晕）→ fade（回神）。
 * 范围：空环绑脚点、fit none，半径按 `data.scale`（实际空明半径 / 1.4）推出，画出来的圈就是空洞铺到的范围。
 * 运动：杂念点从头顶向外散开、碎念下落；空环一拍拍向外推开；轻光晕贴着身体缓慢上浮。
 * 数：碎念片数绑 `data.forgot`（只有真正清掉的状态才计数，没有状态时为 0，不假装清除），
 *   尘点量绑 `data.motes`（特防＋等级派生），空环圈数绑 `data.rings`（等级派生），尺寸与范围绑 `data.scale`（体型派生）。
 * 持续状态：轻光晕绑在载体窗口效果上，随窗口自然到期、刷新或提前清除一起收。
 */
const AmnesiaDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        release: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "release_thought", bind: "source", fit: "body", height: 0.74,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9, spin: 14,
                    lifetime: [8, 14], size: [0.06, 0.015],
                    color: 0xDCEBFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        blank: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "blank_orb", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "motes", fallback: 22 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.002, drag: 0.92, spin: 10,
                    lifetime: [14, 24], size: [0.12, 0.025],
                    color: 0xDCEBFF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 200
                },
                {
                    name: "blank_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "rings", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [18, 28], size: [0.5, 0.9], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "blank_forgot", bind: "source", fit: "body", height: 0.74,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "forgot", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.01, drag: 0.9, spin: 18,
                    lifetime: [10, 18], size: [0.07, 0.015],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "blank_dust", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.92,
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0x9FB4D0, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        },
        sustain: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "sustain_glow", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 2, shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.008, 0.022], spin: 6,
                    lifetime: [14, 24], size: [0.08, 0.018],
                    color: 0xDCEBFF, alpha: [0.22, 0], light: "full", bloom: 0.2, maxParticles: 14
                },
                {
                    name: "sustain_mote", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 1.4, shape: { kind: "sphere", radius: 0.38 },
                    direction: "up", speed: [0.006, 0.016],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xFFFFFF, alpha: [0.18, 0], light: "world", maxParticles: 10
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_dust", bind: "source", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.015, 0.05], gravity: 0.025, drag: 0.92,
                    lifetime: [14, 22], size: [0.05, 0.01],
                    color: 0x9FB4D0, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_amnesia", 1, AmnesiaDefinition);
