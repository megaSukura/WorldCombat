/**
 * 巨力锤 / gigatonhammer 的客户端表现。
 *
 * 一句话：施法者连人带锤旋身蓄力，钢色碎屑绕着它越转越密；巨锤抡下砸在身前地面，锤落处炸开一撮钢屑与尘雾，
 *   一圈冲击波沿地面推开（过顶式向前铺成一条走廊、横扫式绕身扫满一圈）。
 * 色相家族：冷钢灰（0x9AA4AE、0xC9D4DE、0xE6ECF2）做锤与冲击波，白（0xFFFFFF）只给命中那一抹，暖火星只作细节。
 * 拍子：起 wind（蓄力）→ 砸 slam（锤落）→ 击 hit（主目标）/波 wave（波及）→ 收 tired（力竭）。
 * 范围：slam 的地面走廊按 `data.path` 四点画出（与判定同一组顶点），横扫式换成 `data.radius` 的一圈；`data.scale`
 *   让画面尺寸跟着机制范围走。
 * 运动：wind 的碎屑绕身快速旋转、slam 的冲击波沿地面由内向外推开、tired 的尘贴着脚边慢慢升起。
 * 数：`data.dust`（物攻派生）绑定发射量，`data.intensity`（锤击威力派生）抬高亮度，`data.sweep` 区分两种形态。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GigatonhammerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "spin", bind: "source", offset: [0, 0.9, 0], height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.18, 0.5], spread: 8, drag: 0.95,
                    lifetime: [7, 12], size: [0.11, 0.02],
                    color: 0xC9D4DE, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "steel", bind: "source", offset: [0, 0.9, 0], height: 0.8, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 16, shape: { kind: "ring", radius: 1.0, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.2, 0.5], spread: 10, spin: 8,
                    lifetime: [6, 11], size: [0.13, 0.03],
                    color: 0xE6ECF2, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        slam: {
            duration: 34,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "lane", bind: "path", shape: { kind: "polygon" }, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 90, direction: "outward", speed: [0.1, 0.4], spread: 10, gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xB9A88C, alpha: [0.6, 0], light: "world", maxParticles: 160
                },
                {
                    name: "laneSteel", bind: "path", shape: { kind: "polygon" }, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 60, direction: "outward", speed: [0.14, 0.5], spread: 12,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.3], drag: 0.93,
                    lifetime: [9, 16], size: [0.5, 0.12], sizeMode: "index",
                    color: 0xC9D4DE, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.12, 0.44], spread: 26,
                    lifetime: [8, 15], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 70, shape: { kind: "sphere", radius: 0.5 }, direction: "up", speed: [0.06, 0.28], spread: 30,
                    gravity: 0.05, drag: 0.92, lifetime: [12, 20], size: [0.4, 0.1], sizeMode: "sin",
                    color: 0xB9A88C, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "crack", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "dust", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.1, 0.4], spread: 24,
                    lifetime: [7, 13], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.42, maxParticles: 60
                },
                {
                    name: "spall", bind: "target", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "dust", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 }, direction: "outward", speed: [0.14, 0.42], spread: 28, gravity: 0.08,
                    lifetime: [9, 15], size: [0.1, 0.02],
                    color: 0x9AA4AE, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        wave: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "thud", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: { data: "dust", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [8, 14], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xC9D4DE, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 30,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "imprint", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [22, 30], size: { data: "scale", fallback: 1 }, sizeMode: "linear",
                    color: 0x6B6257, alpha: [0.5, 0], light: "world", maxParticles: 2
                },
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "circle", radius: { data: "shockLength", fallback: 4.8 } },
                    direction: "up", speed: [0.02, 0.1], spread: 20, gravity: 0.04, drag: 0.92,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xB9A88C, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        tired: {
            duration: 40,
            exit: { stop: 26, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "source", offset: [0, 0.15, 0], height: 0.1, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], spread: 16, gravity: -0.01, drag: 0.93,
                    lifetime: [16, 26], size: [0.4, 0.14], sizeMode: "sin",
                    color: 0x8A8F96, alpha: [0.3, 0], light: "world", maxParticles: 30
                },
                {
                    name: "heavy", bind: "source", offset: [0, 0.6, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.94,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x9AA4AE, alpha: [0.4, 0], light: "full", bloom: 0.12, maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gigatonhammer", 1, GigatonhammerDefinition);
