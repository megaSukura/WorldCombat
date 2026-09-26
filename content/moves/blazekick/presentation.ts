/**
 * 火焰踢 / blazekick 的客户端表现。
 *
 * 一句话：施法者拧身、火从脚跟裹到脚尖（起），裹火的腿沿一道上扬的火弧从身后挑到身前（踢），
 *   命中处炸开一簇火花、被踢中的人被挑离地面；点着的人身上持续窜起明火（燃）。
 * 色相家族：火橙（0xE2531B 主体）＋亮黄（0xFFB347 细节）＋近白（0xFFF0C0 命中核心）；没有第二个色相。
 * 拍子：起 coil（聚火）→ 踢 spin（火弧划过）→ 中 kick（命中迸火）→ 燃 ignite（持续明火）／挑飞 launch／空 miss。
 * 范围：spin 的火弧用服务端算出的同一组 `data.path` 顶点（从身后低位、越过头顶、落到真实首碰点）以 polyline 画出，
 *   弧线经过的地方就是这一脚的判定轨迹——一条上扬的弧，不是直线也不是正面扇形；首碰落在哪里，弧线就画到哪里。
 * 运动：火星沿弧线从下往上掠过再落向目标；只有原生击飞真正改变了速度，才补一幕向上的升空火星（launch），
 *   被抗性/事件拒绝击飞的目标没有这一幕。
 * 数：`data.embers`（特攻派生）绑定火弧与命中的火星数量，`data.intensity`（威力换算）驱动亮度，与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BlazeKickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "wrap", bind: "source", offset: [0, 0.35, 0.25], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 10 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.12, 0.02],
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "heat", bind: "source", offset: [0, 0.35, 0.25], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.06, 0.01],
                    color: 0xFFF0C0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        spin: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.04, 0.18], spread: 14,
                    lifetime: [5, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 130
                },
                {
                    name: "spark", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "embers", fallback: 14 }, at: 0 },
                    direction: "shape", speed: [0.05, 0.2], spread: 16, gravity: 0.06, drag: 0.92,
                    lifetime: [7, 13], size: [0.08, 0.01], sizeMode: "index",
                    color: 0xFFB347, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "core", bind: "source", offset: [0, 0.6, 0.4], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0xFFB347, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        kick: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "embers", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "cinder", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.07, drag: 0.9,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xE2531B, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                }
            ]
        },
        ignite: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "burn", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 26, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.18],
                    lifetime: [8, 14], size: [0.2, 0.03], sizeMode: "sin",
                    color: 0xE2531B, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "wisp", bind: "target", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 12, shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.14, 0.02],
                    color: 0xFFB347, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        launch: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    // 原生击飞成功才播：目标身上拖起一道向上的火星，拒绝击飞者不出现这一幕。
                    name: "rise", bind: "target", offset: [0, 0.2, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "embers", fallback: 12 }, interval: 4, repeats: 3 },
                    shape: { kind: "cylinder", radius: 0.28, length: 0.5 },
                    direction: "up", speed: [0.04, 0.2], gravity: 0.03, drag: 0.94,
                    lifetime: [7, 14], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "overreach", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "embers", fallback: 8 }, at: 0 },
                    direction: "shape", speed: [0.03, 0.14], gravity: 0.06, drag: 0.9,
                    lifetime: [7, 14], size: [0.07, 0.01],
                    color: 0xE2531B, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_blazekick", 1, BlazeKickDefinition);
