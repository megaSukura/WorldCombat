/**
 * 变圆 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把头一缩、尘点向内收拢，身体蜷成一颗滚圆的球；球面上细密的尘点绕着飞快旋转，
 *   挨打时球贴着地面弹开、朝滚向滚出一段，留下一道旋转的尘尾；展开时尘点向外散尽。
 *
 * 色相家族：暖木棕（0xD9B382）为主体，浅金（0xF2D8A8）做高光，深棕（0xB98B5A／0xC79B68）做余韵；没有第二个色相。
 * 层次：收拢（起）／成球尘、尘环与亮光（击）／绕球的尘（收）／滚动的尘尾与滚轮（撞）／散开（末）。
 * 起击收：tuck（缩）→ curl（成球）→ ball（持球）→ roll（滚动）→ uncurl（展开）。
 * 范围：球环绑自身、fit none，半径按 `data.scale`（实际球半径 / 0.8）推出，画出来的球就是判定护到的体积。
 * 运动：尘点由外向内收；成球时尘环向外推开；持球时尘点绕着球面旋转；滚动时尘尾沿 `data.direction` 拖出，滚轮朝滚向立起。
 * 数：滚动尘量绑 `data.spin`（体重派生），球半径与全部尺寸绑 `data.scale`（体型派生），滚距绑 `data.roll`。
 * 持续状态：持球期低密度、贴身、绕体表旋转，玩家仍看得清目标。
 */
const DefenseCurlDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tuck: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "tuck_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 0.8 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.92, spin: 18,
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xD9B382, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        curl: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "curl_dust", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "spin", fallback: 18 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.9, spin: 26,
                    lifetime: [10, 20], size: [0.15, 0.03],
                    color: 0xD9B382, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "curl_ring", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.13],
                    lifetime: [12, 20], size: [0.36, 0.62], sizeMode: "index",
                    color: 0xB98B5A, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "curl_spark", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12, interval: 5, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9, spin: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xF2D8A8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        ball: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "ball_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "shape", speed: [0.01, 0.03],
                    velocity: { x: "-0.02*sin(t*6.28)", z: "0.02*cos(t*6.28)" },
                    spin: 30, lifetime: [12, 20], size: [0.07, 0.02],
                    color: 0xD9B382, alpha: [0.35, 0], light: "world", maxParticles: 24
                },
                {
                    name: "ball_glint", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 2, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.008, 0.02], spin: 24,
                    lifetime: [12, 20], size: [0.1, 0.03],
                    color: 0xF2D8A8, alpha: [0.3, 0], light: "full", bloom: 0.3, maxParticles: 12
                }
            ]
        },
        roll: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "roll_dust", bind: "source", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "spin", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.06, 0.22], gravity: 0.012, drag: 0.9, spin: 26,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xC79B68, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "roll_wheel", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    orient: "direction",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.34, 0.5], sizeMode: "index",
                    color: 0xF2D8A8, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        uncurl: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "uncurl_dust", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92, spin: 20,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xB98B5A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_defensecurl", 1, DefenseCurlDefinition);
