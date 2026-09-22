/**
 * 流沙地狱 / sandtomb 的客户端表现。
 *
 * 一句话：施法者脚边先卷起一圈回旋的沙粒，随后一撮沙贴着地面飞向目标，落地处当场塌成一片翻涌的沙坑；
 * 沙坑朝坑心收、往下吞，圈里不断扬起被磨下的沙尘，目标被钉在原地打转下沉。
 * 色相家族：砂黄（0xC9A76A）为主、亮沙（0xE8D0A0）做扬起的高光、深褐（0x7A5A3A）做坑底阴影。
 * 拍子：起（charge 聚沙）→ 掷（cast 沙砾）→ 驻（swallow 塌坑 / pit 翻沙 / grind 磨蚀）→ 收（release / slip / air）。
 * 范围：swallow 与 pit 都是 `bind: "point"`、`fit: "none"`，用 `data.radius` 画沙坑边沿——画出来的圈就是流沙生效的那块地。
 * 运动：沙砾贴地飞行；坑内沙粒朝坑心收并被往下带，磨蚀时整坑向上翻涌一撮。
 * 数：`data.flow`（沙坑半径派生）决定翻沙密度，`data.grit`（物攻派生）决定扬尘量，`data.count`（磨蚀威力派生）决定磨蚀那下的沙量，
 *   `data.intensity`（威力 / 24）抬高亮度，`data.scale`（半径 / 1.3）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SandtombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 22, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.1], spin: 8,
                    lifetime: [7, 13], size: [0.14, 0.03],
                    color: 0xC9A76A, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.01, 0.06],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 13], size: [0.06, 0.01],
                    color: 0xE8D0A0, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        cast: {
            duration: 46,
            exit: { stop: 28, drain: 14 },
            emitters: [
                {
                    name: "grit", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 40, shape: { kind: "sphere", radius: 0.2 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 16, trail: { minDistance: 0.22 },
                    lifetime: [7, 12], size: [0.16, 0.03],
                    color: 0xC9A76A, alpha: [0.85, 0], light: "world", maxParticles: 150
                },
                {
                    name: "tail", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.28 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 3, interval: 1, repeats: 14 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.06], spread: 24,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xE8D0A0, alpha: [0.6, 0], light: "world", maxParticles: 100
                }
            ]
        },
        swallow: {
            duration: 28,
            exit: { stop: 13, drain: 16 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 26, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.3 } },
                    direction: "inward", speed: [0.1, 0.24],
                    lifetime: [8, 14], size: [0.24, 0.6],
                    color: 0xE8D0A0, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "splash", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "grit", fallback: 16 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.3 } },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.12, 0.02],
                    color: 0xC9A76A, alpha: [0.8, 0], light: "world", maxParticles: 110
                }
            ]
        },
        pit: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "churn", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "flow", fallback: 36 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1.3 } },
                    direction: "inward", speed: [0.02, 0.1], spin: 6,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xC9A76A, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "sink", bind: "point", offset: [0, 0.5, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 36 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.3 } },
                    direction: "down", speed: [0.01, 0.06],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x7A5A3A, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 16, shape: { kind: "ring", radius: { data: "radius", fallback: 1.3 } },
                    direction: "up", speed: [0.02, 0.09],
                    gravity: -0.004, drag: 0.93,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x8A6A42, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        grind: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE8D0A0, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grit", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [9, 15], size: [0.07, 0.01],
                    color: 0xC9A76A, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.3 } },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xC9A76A, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "collapse", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    gravity: 0.06, drag: 0.89,
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0x7A5A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slip: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "leap", bind: "target", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.08, 0.24],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xC9A76A, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.01],
                    color: 0x9A8A6A, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sandtomb", 1, SandtombDefinition);
