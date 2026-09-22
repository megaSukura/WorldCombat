/**
 * 瞬间失忆 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把念头像尘一样从体内排出去，一圈近白的空洞从身上扩散开，念头尘沉下去；
 *   腾空后的清明以极淡的白光贴着身体维持，回神时残尘散尽。
 *
 * 色相家族：近白（0xDCEBFF）为主体，纯白（0xFFFFFF）做空环与高光，灰蓝（0x9FB4D0）做尘与余韵；没有第二个色相。
 * 层次：排空（起）／空环、空洞与念尘（击）／贴身的微光（收）／落定（末）。
 * 起击收：release（放空）→ blank（空明）→ sustain（维持）→ fade（回神）。
 * 范围：空环绑脚点、fit none，半径按 `data.scale`（实际空明半径 / 1.4）推出，画出来的圈就是空洞铺到的范围。
 * 运动：念头由内向外被排走、念尘下落；空环一拍拍向外推开；维持时微光贴着身体缓慢上浮。
 * 数：念尘量绑 `data.motes`（特防＋等级派生），空环圈数绑 `data.rings`（等级派生），尺寸与范围绑 `data.scale`（体型派生）；
 *   忘记状态时 `data.forgot` 提高一次亮度。
 * 持续状态：维持期低密度、贴身，玩家仍看得清目标。
 */
const AmnesiaDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        release: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "release_thought", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/orbshrink_white",
                    rate: 14, shape: { kind: "sphere", radius: 1.2 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xDCEBFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        blank: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "blank_orb", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "motes", fallback: 22 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.002, drag: 0.92, spin: 10,
                    lifetime: [14, 24], size: [0.14, 0.03],
                    color: 0xDCEBFF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "blank_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: { data: "rings", fallback: 2 }, interval: 6 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [18, 28], size: [0.5, 1.0], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "blank_dust", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.8 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.92,
                    lifetime: [16, 26], size: [0.06, 0.01],
                    color: 0x9FB4D0, alpha: [0.45, 0], light: "world", maxParticles: 48
                }
            ]
        },
        sustain: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "sustain_glow", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.025], spin: 6,
                    lifetime: [14, 24], size: [0.09, 0.02],
                    color: 0xDCEBFF, alpha: [0.3, 0], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    name: "sustain_mote", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.008, 0.02],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xFFFFFF, alpha: [0.24, 0], light: "world", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade_dust", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.015, 0.05], gravity: 0.025, drag: 0.92,
                    lifetime: [14, 22], size: [0.05, 0.01],
                    color: 0x9FB4D0, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_amnesia", 1, AmnesiaDefinition);
