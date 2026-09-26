/**
 * 流沙地狱 / sandtomb 的客户端表现。
 *
 * 一句话：瞄准的地面先裂开一圈细沙，6 刻后沙坑张开、沙粒朝坑心翻涌；踏进去的目标脚边沙圈随陷入时间升高，
 * 腾空或走出坑沿时沙线断开，坑自己到期或地面被毁则渐渐平息。
 * 色相家族：砂黄（0xC9A76A）为主、亮沙（0xE8D0A0）做扬起的高光、深褐（0x7A5A3A）做坑底阴影。
 * 拍子：裂（charge 地面细沙裂纹）→ 张（open 塌陷、pit 翻流）→ 陷（sink 入坑 / bound 脚边沙圈 / grind 磨蚀）
 *        → 收（slip 起跳断开 / release 平息；落空用 miss）。
 * 范围：open／pit／sink 都是 `bind: "point"`、`fit: "none"`，用 `data.radius` 画坑沿——画出来的圈就是流沙生效的那块地；
 *   `bound` 也按点绑定，随目标每 2 刻更新一次脚部位置。
 * 运动：沙粒整体朝坑心收并被向下带，磨蚀时整坑向上翻涌一撮；陷入越深 `data.depth` 把脚边沙圈抬得越高，身体不位移。
 * 数：`data.flow`（坑半径派生）决定翻沙密度，`data.grit`（物攻派生）决定扬尘量，`data.count`（磨蚀威力派生）决定磨蚀那下的沙量，
 *   `data.intensity`（威力与陷入进度派生）抬高亮度，`data.scale`（半径 / 1.3）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SandtombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "crack", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "inward", speed: [0.01, 0.06], spin: 5,
                    lifetime: [6, 11], size: [0.11, 0.02],
                    color: 0xC9A76A, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "inward", speed: [0.01, 0.05],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [6, 11], size: [0.05, 0.01],
                    color: 0xE8D0A0, alpha: [0.55, 0], light: "world", maxParticles: 50
                }
            ]
        },
        open: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "inward", speed: [0.1, 0.24],
                    lifetime: [8, 14], size: [0.24, 0.6],
                    color: 0xE8D0A0, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "splash", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "grit", fallback: 16 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.2 } },
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
                    rate: { data: "flow", fallback: 36 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "inward", speed: [0.02, 0.1], spin: 6,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xC9A76A, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "sink", bind: "point", offset: [0, 0.5, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 30 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.2 } },
                    direction: "down", speed: [0.01, 0.06],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x7A5A3A, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "up", speed: [0.02, 0.09],
                    gravity: -0.004, drag: 0.93,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x8A6A42, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        sink: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "gulp", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "grit", fallback: 16 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.2 } },
                    direction: "inward", speed: [0.06, 0.18],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.11, 0.02],
                    color: 0xC9A76A, alpha: [0.75, 0], light: "world", maxParticles: 60
                }
            ]
        },
        bound: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "climb", bind: "point", offset: [0, { data: "depth", fallback: 0 }, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "grit", fallback: 16 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.01, 0.05], spin: 4,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xC9A76A, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grip", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.01, 0.04],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 13], size: [0.05, 0.01],
                    color: 0xE8D0A0, alpha: [0.45, 0], light: "world", maxParticles: 45
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
                },
                {
                    name: "snap", bind: "target", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.12],
                    gravity: 0.06, drag: 0.89,
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0x7A5A3A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "settle", bind: "target", offset: [0, 0.05, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xC9A76A, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
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
