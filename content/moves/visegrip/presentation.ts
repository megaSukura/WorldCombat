/**
 * 夹住 / visegrip 的客户端表现。
 *
 * 一句话：施法者双钳张开、身子压低，随后两钳从两侧合上，在目标身上收拢成一圈向内挤的力道，
 * 撞出一撮碎屑，命中后目标被这圈力道朝施法者方向带近。
 * 色相家族：暖橙与骨白（grab / hit / impact_normal / spike）为主体，近白只做钳口合上的一下。
 * 拍子：起（open 双钳张开蓄势）→ 夹（clamp 合上、向内挤、迸出碎屑）→ 收（miss 夹空）。
 * 范围：这招只作用在贴身一个目标身上，所以每层都绑 `target`（或施法者 `source`），没有地面圈。
 * 运动：钳口从外向内收拢（`direction: "inward"`），碎屑向外迸；被拽近时力道随 `target` 锚点移动。
 * 数：`data.motes`（物攻派生）决定碎屑量，`data.drag`（物攻与目标质量派生）决定向内收拢的强度与残余，
 *   `data.intensity`（本击威力派生）抬高命中亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const VisegripDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        open: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gape", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 14], size: [0.2, 0.05], spin: 6,
                    color: 0xE8B0A0, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.15, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], spread: 16,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC8A898, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        clamp: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "grip", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.5, 0.6], sizeMode: "index",
                    color: 0xF0D8C8, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "crush", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "specks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "motes", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xDCC3B0, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "squeeze", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "drag", fallback: 0.9 } },
                    direction: "inward", speed: [0.04, 0.14], spread: 8,
                    lifetime: [10, 18], size: [0.4, 0.5], sizeMode: "linear",
                    color: 0xE8B0A0, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "snap", bind: "source", offset: [0, 0.4, 0.2], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], spread: 14,
                    lifetime: [8, 14], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xD8C0A8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_visegrip", 1, VisegripDefinition);
