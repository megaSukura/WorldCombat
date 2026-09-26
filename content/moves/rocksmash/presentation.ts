/**
 * 碎岩 / rocksmash 的客户端表现。
 *
 * 一句话：拳上聚起薄土，随后拳头沿施法者到目标的一条短线一记记打出去，每拳只在命中点留下一小段触痕；砸开缺口时
 * 目标身上崩开一圈石屑。
 * 色相家族：土黄与岩灰（large_rock／impact_rock 原色、tinydust 中性）＋一处近白高光（glowingsparkle）。
 * 拍子：起（windup 聚土）→ 击（strike 每记拳）→ 收（crack 缺口崩开）。
 * 范围：strike 用 path 画出服务端 trace 那一段命中点附近的短触痕，拳够到哪、触痕就落在哪；命中爆开在同一个落点上。
 * 运动：碎石从落点朝外飞、受重力落地，土屑慢速下沉。
 * 数：`data.notes`（单拳威力换算）绑定碎石数量，`data.index`／`data.jabs` 让每一记拳有自己的节拍，
 * `data.hit` 让空拳不炸开碎石。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RocksmashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0x8A7A5A, alpha: [0.35, 0], light: "world", maxParticles: 24
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0x9C8455, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        strike: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reach", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.05, 0.18], spread: 10,
                    lifetime: [4, 9], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xD8C79A, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "fist", bind: "point", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    lifetime: [6, 10], size: [0.5, 0.2], sizeMode: "linear",
                    color: 0xE8D8B0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "stone", bind: "point", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "notes", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 14], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xB89E6A, alpha: [1, 0], light: "full", maxParticles: 60
                },
                {
                    name: "chips", bind: "point", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x8A7A5A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spark", bind: "point", offset: [0, 0.0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xFFE9C0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.7, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock_white",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [8, 15], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xE8D0A0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "shard", bind: "target", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.07, drag: 0.9,
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0x9C8455, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rocksmash", 1, RocksmashDefinition);
