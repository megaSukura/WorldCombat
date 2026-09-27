/**
 * 摇尾巴 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者背向敌人摆开尾巴，贴着地面把身后 120 度扇带铺出来，尾尖再从一侧扫到另一侧、间隔 6 刻反扫回来；
 *   被尾巴晃到、防御真的掉下去的人身上卷起打转的护甲线，之后头顶持续浮着晃神的余韵。
 *
 * 色相家族：暖橙（0xE0A060／0xE08E52）为主体，奶油白（0xFFE8D0／0xFFF2E0）只做尾迹高光，浅褐尘（0xD8C0A0）收地面。
 * 层次：转身预备（起手，身后聚点）→ 判定扇带（band，铺满背后 120°，一眼看出作用区）→ 尾尖短弧逐刻扫过（swing，每刻一条真实子弧）
 *   → 落到人身上的晃动护甲线（mark）→ 头顶余韵（linger）→ 落尘（没甩到人，fizzle）。
 * 范围：band 与服务端 `WorldGeometry.bodyPolygon` 判定读同一份扇带顶点；swing 的 `data.path` 每刻只有当刻子弧的三个端点，
 *   与服务端那一刀判定的端点同源，尾尖扫到哪就是打到哪，正面与身后分得清。
 * 数：`data.arcs`（速度派生的尾迹量）驱动扇带与尾尖密度，`data.drop` 决定命中护甲线的重数，`data.scale`（半径 / 3）缩放地面范围。
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
                },
                {
                    // 起手预告：把这次真正的背后 120 度扇带边缘淡淡铺出来，与服务端判定读同一份顶点。
                    name: "whip_fan", bind: "path", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.01, 0.045], spread: 6,
                    lifetime: [8, 14], size: [0.06, 0.015],
                    color: 0xE0A060, alpha: [0.28, 0], light: "world", maxParticles: 60
                }
            ]
        },
        band: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "band_fill", bind: "path", fit: "none", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "arcs", fallback: 24 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.02, 0.08], spread: 14, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xD8C0A0, alpha: [0.28, 0], light: "world", maxParticles: 90
                },
                {
                    name: "band_edge", bind: "path", fit: "none", height: 0.16,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "arcs", fallback: 24 }, shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.03, 0.1], spread: 10, spin: 12,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFE8D0, alpha: [0.4, 0], light: "full", maxParticles: 120
                }
            ]
        },
        swing: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "tip_arc", bind: "path", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "arcs", fallback: 24 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.16], spread: 8, spin: 14,
                    lifetime: [8, 15], size: [0.13, 0.03], sizeMode: "sin",
                    color: 0xFFF2E0, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "tip_edge", bind: "path", fit: "none", height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "arcs", fallback: 24 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.14], spread: 12, spin: 18,
                    lifetime: [8, 15], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xE0A060, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "tail_root", bind: "source", fit: "body", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE0A060, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "mark_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "drop", fallback: 1 }, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.11], spin: 6,
                    lifetime: [10, 16], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0xE08E52, alpha: [0.55, 0], light: "full", maxParticles: 26
                },
                {
                    name: "mark_arcs", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "arcs", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.16], spread: 24, spin: 18,
                    lifetime: [9, 16], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xFFE8D0, alpha: [0.85, 0], light: "full", maxParticles: 50
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
                    name: "fizzle_dust", bind: "source", height: 0.3,
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
