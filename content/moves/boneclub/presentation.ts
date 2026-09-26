/**
 * 骨棒 / boneclub 的客户端表现。
 *
 * 一句话：举棍转腰 → 直刺时握点到棒头连成一条窄长的骨白武器线，横扫时同一根骨棒在数刻里由左至右划过，
 * 轨迹拼成一道弧；碰到身体或墙的当刻端点才炸开骨屑，撞墙的端点闪出一撮碎石，落空只在棒端散一小撮尘。
 * 色相家族：骨白（0xEAE0C8 / 0xC8B48E）与土棕（0x8A7A62）；饱和色只在骨屑尖端一点。
 * 拍子：起 raise（举棍）→ 挥 thrust（直刺线）／ club + arc（横扫每刻长轴与轨迹）→ hit（命中）／ wall（敲墙）／ miss（空抡）。
 * 范围：thrust／club 的 polyline 直接消费服务端 `data.path`（握点 ↔ 当刻棒头），画出的就是真正够到的那条线；
 *       arc 消费已划过的端点序列，画出横扫真实的弧。
 * 运动：骨棒长轴每刻随服务端更新，端点碰到谁／哪面墙就停在哪里。
 * 数：`data.clubs`（威力派生）决定骨屑与土雾点数，`data.reach` 与 `data.gauge` 记录真实长度与半宽，
 * `data.scale`（半宽 / 0.5）放大骨屑与光边。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BoneclubDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "heft", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 9, shape: { kind: "arc", radius: 0.5, arcDegrees: 140 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xEAE0C8, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        thrust: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shaft", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 130, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.88, 0], light: "full", maxParticles: 150
                },
                {
                    name: "tip", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    shape: { kind: "polyline" },
                    rate: 30, direction: "shape", speed: [0.05, 0.2],
                    lifetime: [4, 9], size: [0.18, 0.05],
                    color: 0xF2E8CE, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        club: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "shaft", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline" },
                    rate: 150, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "head", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "outward", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.16, 0.04],
                    color: 0xF2E8CE, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        arc: {
            duration: 8,
            exit: { stop: 3, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 80, direction: "up", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xC8B48E, alpha: [0.55, 0], light: "world", maxParticles: 150
                },
                {
                    name: "edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "up", speed: [0.02, 0.07],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xEAE0C8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 110
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bone_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "clubs", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ground_grit", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0x8A7A62, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shards", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "clubs", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [6, 12], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.95, 0], light: "full", maxParticles: 50
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.28, 0.05], sizeMode: "index",
                    color: 0x8A7A62, alpha: [0.9, 0], light: "full", maxParticles: 34
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "knocked", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xEAE0C8, alpha: [0.85, 0], light: "full", bloom: 0.22, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xC8B48E, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_boneclub", 1, BoneclubDefinition);
