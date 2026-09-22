/**
 * 瞪眼 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者眯起眼，一道冷白带钢青的目光沿身前扫成一整个扇面，扇面里被扫到的人身上亮起被锁定的尖光。
 *
 * 色相家族：钢青（0x7FA6C4／0x9FB6C8）为主体，冷白（0xBFD6E8／0xEAF4FF）只做锋线高光；没有第二个色相。
 * 层次：眯眼聚光（起手）→ 目光锥＋扇面填充＋扇面锋线（扫出去）→ 尖光落到人身上 → 头顶余韵（持续）→ 落尘（没人可扫）。
 * 起击收：windup（聚光）→ sweep（铺开整个扇面）→ mark（落到人身上）→ linger（破防还在，慢慢离场）。
 * 范围：sweep 的扇面顶点来自服务端 data.path（与判定用的 sector 同一组顶点），铺到哪就是会被扫到哪；
 *   长度读 data.reach、张角读 data.halfAngle，与机制同源，玩家一眼看出该站在扇面外还是掩体后。
 * 运动：目光沿锥轴从眼睛推出、沿扇面顶点连线扫满整片；被扫到的人身上尖光从体内向外一炸。
 * 数：目光量绑 data.glares（速度派生），扫到人数 data.hits 缩放锋线密度与整体亮度。
 */
const LeerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "leer_gather", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "ring", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xEAF4FF, alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        sweep: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "leer_beam", bind: "source", height: 0.78, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash", spriteFrom: "random",
                    rate: { data: "glares", fallback: 24 },
                    shape: { kind: "cone_volume", radius: 0.5, length: { data: "reach", fallback: 5 }, angleDegrees: { data: "halfAngle", fallback: 45 } },
                    direction: "shape", speed: [0.1, 0.3], spread: 6,
                    lifetime: [6, 12], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xBFD6E8, alpha: [0.7, 0], light: "full", maxParticles: 200
                },
                {
                    name: "leer_fan", bind: "path", offset: [0, -0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polygon" },
                    rate: { data: "glares", fallback: 24 }, direction: "shape", speed: [0.03, 0.1], spread: 16,
                    lifetime: [7, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x7FA6C4, alpha: [0.6, 0], light: "full", maxParticles: 180
                },
                {
                    name: "leer_edge", bind: "path", offset: [0, -0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline", closed: true },
                    rate: 34, direction: "shape", speed: [0.06, 0.2], spread: 8,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xEAF4FF, alpha: [0.75, 0], light: "full", maxParticles: 220
                },
                {
                    name: "leer_dust", bind: "path", offset: [0, -0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "glares", fallback: 24 }, direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x9FB6C8, alpha: [0.4, 0], light: "world", maxParticles: 140
                }
            ]
        },
        mark: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "mark_shards", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/slash", spriteFrom: "random",
                    burst: { count: { data: "glares", fallback: 24 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], spread: 22,
                    lifetime: [7, 14], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xBFD6E8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "mark_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [10, 16], size: [0.24, 0.1],
                    color: 0x7FA6C4, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        linger: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "linger_shards", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xBFD6E8, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_dust", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0x9FB6C8, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_leer", 1, LeerDefinition);
