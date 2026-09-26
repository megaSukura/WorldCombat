/**
 * 欺诈 / foulplay 的客户端表现。
 *
 * 一句话：施法者脚边聚起一团暗影，一条暗影手臂从身体顺瞄准方向逐刻伸长；第一个碰到的身体处，手爪反向一拧，
 *   对手物攻越高、腕纹越粗；纠缠式再拖着它往回滑一段。
 * 色相家族：暗紫一族（0x4B3FA0 主体 / 0x6C5CE0 棘与边缘 / 0xA99CFF 只做细碎高光，烟尘用近黑 0x2A2440）。
 * 拍子：起 coil（0-10t 聚影）→ 伸 crawl（暗手从身体逐刻伸到真实头部，时长由逐刻推进决定）→
 *   击 seize（在真实接触点竖起棘、向外炸开）→ 收 drag（纠缠拖拽）／miss（落空/撞墙散去）。
 * 范围：crawl 的线只画到**真实的暗手头** `data.path`（[-[-source-]-]，[头坐标]），不预画满射程；
 *   seize 与 drag 的棘与拖痕绑在真实被抓者身上——玩家一眼看出「线到哪、手就抓到哪」。
 * 运动：crawl 每刻由服务端更新头部顶点，线随真实伸长而变长；seize 的棘朝上竖起、碎片向外炸开。
 * 数：棘数绑定 `data.tendrils`（等级与目标物攻换算），抓握强度绑定 `data.intensity`（实际被反拧者的物攻换算），
 *   尺寸绑定 `data.scale`（抓握半径换算）。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const FoulplayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x6C5CE0, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "shade", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.28, 0.1],
                    color: 0x2A2440, alpha: [0.35, 0], drag: 0.94, light: "world", maxParticles: 24
                }
            ]
        },
        crawl: {
            duration: 40,
            exit: { stop: 1, drain: 10 },
            emitters: [
                {
                    name: "arm", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "shape", speed: [0.0, 0.05],
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x4B3FA0, alpha: [0.7, 0], light: "full", maxParticles: 140
                },
                {
                    name: "fume", bind: "path", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.2, 0.08], sizeMode: "index",
                    color: 0x2A2440, alpha: [0.3, 0], light: "world", maxParticles: 70
                },
                {
                    name: "claw", bind: "path", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 14, direction: "up", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.08, 0.02], sizeMode: "index",
                    color: 0xA99CFF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        seize: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "spikes", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: { data: "tendrils", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.08, 0.3],
                    lifetime: [8, 15], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x6C5CE0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "grasp", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 14], size: { data: "intensity", fallback: 0.26 }, sizeMode: "index",
                    alpha: [1, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shards", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "tendrils", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xA99CFF, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        drag: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "rope", bind: "path", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    shape: { kind: "polyline" },
                    rate: 24, direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.08], sizeMode: "index",
                    color: 0x4B3FA0, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "pull_marks", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    rate: 18, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xA99CFF, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dissipate", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0x4B3FA0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_foulplay", 1, FoulplayDefinition);
