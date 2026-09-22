/**
 * 守住的客户端表现。
 *
 * 一句话：一圈半透明的穹顶从脚下升起裹住自己，迎面来的每一击在罩面上炸开一圈冲击弧，罩子随被磨而变暗变小，最后碎成一地光屑。
 * 色相家族：冷白与薄蓝为主（smallring / screen / xsfadeorb），强调只用 impact_normal 的原色亮帧。
 * 拍子：起（raise 0–8t，光纹向上收拢）→ 击（block 每次拦截的冲击弧）→ 收（shatter 碎裂，或静静散去）。
 * 范围：hold 的环与幕按 `data.scale`（穹顶半径／1.7）铺满同一半球——画面就是被判定的那块区域。
 * 运动：升起时光纹上收，持罩期间近乎静止缓慢自转；被击中处沿 `data.direction` 弹出一圈冲击弧。
 * 数：`data.intensity`（剩余护盾量／初始量）决定罩的亮度与发射密度，`data.blocked`／`data.remaining` 写进浮字。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ProtectDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 12,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "rise_ring", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 40, shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.45, 0.12],
                    color: 0xBEE3FF, alpha: [0.5, 0], light: "full", maxParticles: 160
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 30, shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1.0 } },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xDCF2FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xC7D8E6, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        hold: {
            // 持续状态：低密度、放脚边，玩家透过它仍看得清目标。
            emitters: [
                {
                    name: "dome_shell", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 6, shape: { kind: "hemisphere", radius: { data: "scale", fallback: 1.0 } },
                    direction: "shape", speed: [0.0, 0.01], spin: 2,
                    lifetime: [30, 48], size: [0.6, 0.6],
                    color: 0x9CC8E8, alpha: [0.12, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 24
                },
                {
                    name: "rim", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 5, shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [26, 40], size: [0.5, 0.5], sizeMode: "sin",
                    color: 0xBEE3FF, alpha: [0.2, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 16
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.4, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "hemisphere", radius: { data: "scale", fallback: 1.0 } },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xE8F6FF, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "shock", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "arc", radius: 0.7, arcDegrees: 150 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.36, 0.1],
                    color: 0xCFE9FF, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "sparks", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 24 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.07, 0.24], spread: 30,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xE8F6FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        shatter: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "break", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "hemisphere", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.34],
                    lifetime: [8, 15], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xBFE3FF, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "shards", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 40 },
                    shape: { kind: "hemisphere", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.28], spin: 20,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [12, 24], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xE8F6FF, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "fade_ring", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 28 },
                    shape: { kind: "ring", radius: 0.65 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.5, 0.1],
                    color: 0x9CC8E8, alpha: [0.5, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_protect", 1, ProtectDefinition);
