/**
 * 修长之角 / smartstrike 的客户端表现。
 *
 * 一句话：角尖顶起一线钢光，一条锁定细线连到对手；随后施法者带着角一路拐着方向冲过去，追到身上时在甲缝上
 * 迸出一簇钢花与一圈冲击环。
 * 色相家族：钢银与冷白（drill／smallbeam／impact_steel），强调处用一点暖金（glowingsparkle_yellow）。
 * 拍子：起（lock 锁定）→ 击（charge 冲锋、stab 扎入、pierce 甲缝迸花）→ 收（miss 空刺）。
 * 范围：lock 与 stab 使用 `data.path`／目标锚点画出服务端锁定的那条线，线连到哪就是角刺够到哪。
 * 运动：钢光顺锁定线汇聚，冲锋沿朝向目标的轴拉出，命中处钢花沿球面炸开。
 * 数：`data.intensity`（突刺威力派生）抬高锁定与命中的亮度，`data.notes`（威力派生）决定迸出的钢花量，
 * `data.scale`（角尖半径派生）缩放冲击环与命中范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SmartstrikeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lock: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "reticle", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.0, 0.02],
                    lifetime: [8, 16], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xC9D6E0, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "aim", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orbshrink_white",
                    rate: 18, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xF2D89A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "target_ring", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.35 },
                    direction: "inward", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [0.26, 0.42], sizeMode: "sin",
                    color: 0xE8C86A, alpha: [0.4, 0], light: "world", maxParticles: 10
                }
            ]
        },
        charge: {
            duration: 34,
            exit: { stop: 26, drain: 10 },
            emitters: [
                {
                    name: "lance", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "line", length: 1.4 },
                    rate: 40, direction: "up", speed: [0.02, 0.1],
                    lifetime: [4, 9], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xEAF1F6, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 130
                },
                {
                    name: "drill", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/drill",
                    rate: 26, shape: { kind: "cone", radius: 0.22, angleDegrees: 16 },
                    direction: "shape", speed: [0.05, 0.2], spin: 90,
                    lifetime: [4, 9], size: [0.18, 0.04],
                    color: 0xC9D6E0, alpha: [0.85, 0], light: "world", maxParticles: 110
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "sphere", radius: 0.2 },
                    direction: "away", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.07, 0.02],
                    color: 0xFFF2C0, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 90
                }
            ]
        },
        stab: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "notes", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.1, 0.34],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xDCE6EE, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 80
                },
                {
                    name: "spike", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.4], spread: 24,
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0xE8C86A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        pierce: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "armor", bind: "target", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 26 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFF2C0, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 70
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xC9D6E0, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xC9D6E0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_smartstrike", 1, SmartstrikeDefinition);
