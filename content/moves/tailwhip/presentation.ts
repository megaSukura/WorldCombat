/**
 * 摇尾巴 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者转过身把尾巴左右甩开一圈，贴着地面画出一圈尾巴扫过的弧光，被尾巴晃到的人身上卷起打转的影。
 *
 * 色相家族：暖橙（0xE0A060／0xE08E52）为主体，奶油白（0xFFE8D0／0xFFF2E0）只做尾迹高光，浅褐尘（0xD8C0A0）收地面。
 * 层次：转身预备（起手，身后聚点）→ 地面环＋甩出的弧光＋星点（绕身一圈）→ 打转的影（落到人身上）→ 头顶余韵（持续）→ 落尘（没人可甩）。
 * 起击收：windup（转身）→ sweep（绕身甩开）→ wobble（落到人身上）→ linger（晃神还在，慢慢离场）。
 * 范围：sweep 的地面环是一条完整的圆，定点绑自身、按身体写 3 格参考半径，由服务端 data.scale = 尾巴半径 / 3 缩放到真实半径；
 *   它绕身一整圈，所以比「瞪眼」的身前扇面多罩住身后的人。
 * 运动：地面环向外扩、星点沿整圈甩出、尾迹贴着低空画弧；被晃到的人身上光影打转。
 * 数：星点与尾迹的数量读服务端 data.arcs（速度派生），晃到人数 data.hits 缩放整体密度。
 */
const TailwhipDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "whip_gather", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFE8D0, alpha: [0.55, 0], light: "full", maxParticles: 26
                }
            ]
        },
        sweep: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "sweep_ground", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "arcs", fallback: 24 } }, shape: { kind: "ring", radius: 3 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.6],
                    color: 0xE0A060, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "sweep_arcs", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "arcs", fallback: 24 }, interval: 4, repeats: 3 }, shape: { kind: "circle", radius: 3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 14, spin: 12,
                    lifetime: [12, 20], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFE8D0, alpha: [0.75, 0], light: "full", maxParticles: 110
                },
                {
                    name: "sweep_arc", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "arcs", fallback: 24 },
                    shape: { kind: "arc", radius: 3, arcDegrees: 220 },
                    direction: "shape", speed: [0.04, 0.14], spread: 8,
                    lifetime: [10, 18], size: [0.13, 0.03], sizeMode: "sin",
                    color: 0xFFF2E0, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "sweep_dust", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "arcs", fallback: 24 }, shape: { kind: "ring", radius: 3 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xD8C0A0, alpha: [0.4, 0], light: "world", maxParticles: 80
                }
            ]
        },
        wobble: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "wobble_arcs", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "arcs", fallback: 24 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.16], spread: 24, spin: 16,
                    lifetime: [9, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE8D0, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wobble_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [10, 16], size: [0.26, 0.1],
                    color: 0xE0A060, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        linger: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "linger_arcs", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 3, shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03], spin: 8,
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFE8D0, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_orbs", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xD8C0A0, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xD8C0A0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tailwhip", 1, TailwhipDefinition);
