/**
 * 猛撞 / takedown 的客户端表现。
 *
 * 一句话：缩肩低头沿一条短直线把自己砸出去，撞实的一刻从命中点迸开成片的米白冲击与尘屑，
 * 反作用力顺着原路把施法者顶回一小步；冲空只是脚下一圈滑停的沙尘。
 * 色相家族：砂金（0xC9B48A）与米白（0xE8DFC9）；后坐的暗红（0xC96A4A）只在自损那一下出现。
 * 拍子：起 windup（缩肩蓄势）→ 冲 charge（贴地短直线冲刺）→ impact（命中峰值）＋ recoil（真付生命才有的自损星点）／ bounce（接触后坐短尘）／ miss（滑停）。
 * 范围：charge 的尘带绑在施法者真实身体上（bind source），只随实际移动铺开；impact 与 recoil 绑命中点／自身。
 * 运动：速度线沿 `data.direction` 掠过；命中后碎屑沿冲撞方向散开；bounce 是任何接触后的一撮短尘，recoil 星点只按自损回执出现。
 * 数：`data.hits`（撞劲派生）决定命中迸发粒子数，`data.dust`（体重与物攻派生）决定冲线与滑停的扬尘密度，
 * `data.intensity`（撞劲 / 90）抬高亮度，`data.scale`（判定半径 / 0.5）放大尘环。
 */
const TakedownDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.38 },
                    direction: "outward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 26
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 5, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 13], size: [0.1, 0.03],
                    color: 0xC9B48A, alpha: [0.5, 0], light: "world", maxParticles: 14
                }
            ]
        },
        charge: {
            duration: 40,
            exit: { stop: 24, drain: 14 },
            emitters: [
                {
                    name: "plough", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "dust", fallback: 16 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 200
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.45, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 34, shape: { kind: "box", size: [0.32, 0.26, 0.32] },
                    direction: "shape", speed: [0.02, 0.09], trail: { minDistance: 0.24 },
                    lifetime: [5, 9], size: [0.18, 0.05],
                    color: 0xE8DFC9, alpha: [0.7, 0], light: "full", maxParticles: 200
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hits", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24], spread: 14,
                    lifetime: [8, 14], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xE8DFC9, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.48 },
                    direction: "outward", speed: [0.08, 0.2], spread: 8,
                    lifetime: [10, 16], size: [0.32, 0.08],
                    color: 0xCFC2A6, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        recoil: {
            duration: 22,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "shock", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 7 },
                    shape: { kind: "hemisphere", radius: 0.4, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.22],
                    lifetime: [9, 15], size: [0.15, 0.04],
                    color: 0xC96A4A, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        bounce: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0xA9A08C, alpha: [0.6, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_takedown", 1, TakedownDefinition);
