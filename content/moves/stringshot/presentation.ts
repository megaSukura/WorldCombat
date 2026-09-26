/**
 * 吐丝 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：从口边射出一缕银白的丝，丝身后拖着速度线；撞上对手时收紧成一条线、爆开一小团丝结把腿脚裹住；
 *   撞上墙面时同一根丝绷在表面上，只在真实接触点外侧摊开一小片网，摊不下就只留一段装饰丝。
 *
 * 色相家族：近白丝（0xF2F0E8）与冷灰（0xE6E2D6／0xD9DED8）为主体，深一点的灰只做细节。没有第二个色相。
 * 层次：丝光（起手）→ 丝身＋速度线（飞行）→ 丝结＋绷紧连线（缠住）→ 首碰表面小网（实放）→
 *   短丝印（没摊开）→ 掉速到底线的灰白（无效）→ 未干丝光（持续）。
 * 起击收：windup（蓄丝）→ strand（丝飞出去）→ bind／net（落到人身上或表面）→ tangle（只留装饰丝）→ linger。
 * 数：缠住时爆开的丝量按服务端 data.coils 派生；实放蛛网的量按 data.threads，画出的半径读 data.radius。
 */
const StringShotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "silk_gather", bind: "source", offset: [0, 0.25, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0xF2F0E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        strand: {
            duration: 20,
            emitters: [
                {
                    name: "strand_wisp", bind: "projectile", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.14, 0.03], spin: 14,
                    color: 0xF2F0E8, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "strand_dash", bind: "projectile", height: 0.15, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD9DED8, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bind: {
            duration: 28,
            emitters: [
                {
                    name: "bind_core", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "coils", fallback: 18 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [8, 14], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xEDEDED, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "bind_wrap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.18, 0.06],
                    color: 0xD9DED8, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "bind_line", bind: "path", offset: [0, 0.72, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xF2F0E8, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        net: {
            duration: 30,
            emitters: [
                {
                    name: "net_patch", bind: "point", height: 0.14, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "threads", fallback: 12 }, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.18, 0.05],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "net_dust", bind: "point", height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "circle", radius: { data: "radius", fallback: 1.0 } }, direction: "up",
                    speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2F0E8, alpha: [0.5, 0], light: "world", maxParticles: 50
                },
                {
                    name: "net_taut", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 20, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xD9DED8, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        tangle: {
            duration: 22,
            emitters: [
                {
                    name: "tangle_knot", bind: "point", height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.04],
                    color: 0xE6E2D6, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "tangle_line", bind: "path", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    shape: { kind: "polyline" },
                    rate: 16, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xF2F0E8, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "tangle_dust", bind: "point", height: 0.18, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        ward: {
            duration: 18,
            emitters: [
                {
                    name: "ward_fade", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD9DED8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_silk", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0xE6E2D6, alpha: [0.35, 0], light: "world", maxParticles: 14
                },
                {
                    name: "linger_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stringshot", 1, StringShotDefinition);
