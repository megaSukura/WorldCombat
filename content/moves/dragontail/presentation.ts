/**
 * 龙尾 / dragontail 的客户端表现。
 *
 * 一句话：施法者身后拢起一道龙鳞紫的尾光，随即粗尾从一侧到另一侧真实摆过——紫色的尾身贴着弧线扫出去、
 *   尾尖一段亮得更白，被扫中的敌人身上炸开一记龙击并被抛向远处。
 * 色相家族：龙鳞紫（0x7C5CD8 主体、0x5B3FA8 余韵）＋淡紫白（0xE4DAFA）只给尾锋与外缘高光；没有第二个色相。
 * 拍子：起（windup 拢尾，尾根位置与先扫侧由服务端按朝向给出）→ 扫（sweep 尾体每刻把 `data.path` 更新到
 *   当刻真实子段，用 rate 让后半扫继续出尾迹，而不是只响开头几刻的 burst）→ 结果（impact 逐目标龙击，
 *   尾梢重击更大更亮）→ 空（miss 落空）。
 * 范围：sweep 的尾体用 `data.path`（当刻身体中心 → 当刻尾端）以 polyline 采样，尾端 `data.point` 放尾尖亮斑；
 *   尾端被墙截断时路径与亮斑一起停在接触点，画出来的就是真实扫到的那一段。
 * 数：尾身与尾尖的粒子数量由 `data.shards`（物攻派生）驱动；命中那一记用 `data.size` 区分尾梢／内段强弱。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonTailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    // 蓄尾位置由服务端按朝向给出：point 绑定读 message 位置（尾根），不再恒在世界 -Z。
                    name: "coil", bind: "point", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0x7C5CD8, alpha: [0.6, 0], light: "full", maxParticles: 44
                },
                {
                    name: "scale", bind: "point", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 4, interval: 4, repeats: 3 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.01],
                    color: 0xE4DAFA, alpha: [0.8, 0], light: "full", maxParticles: 24
                },
                {
                    // 先扫侧：从尾根到尾根前方起扫那一侧的一条引线，读得出尾会先扫哪边。
                    name: "lead", bind: "path", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xE4DAFA, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        sweep: {
            duration: 10,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    // 每刻同一实例但 path 被更新到当刻真实子段，rate 让后半扫继续出尾迹（burst 只会响开头几刻）。
                    name: "tail", bind: "path", fit: "none", offset: [0, 0.32, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: { data: "shards", fallback: 14 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.2], spread: 18,
                    lifetime: [6, 12], size: [0.18, 0.52], sizeMode: "index",
                    color: 0x7C5CD8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 220
                },
                {
                    name: "tip", bind: "point", fit: "none", offset: [0, 0.32, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    rate: { data: "shards", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [6, 12], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xE4DAFA, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0.28, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10,
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xE4DAFA, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.07, 0.24], spread: 26,
                    lifetime: [6, 12], size: [{ data: "size", fallback: 0.3 }, 0.05], sizeMode: "index",
                    color: 0x7C5CD8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 34
                },
                {
                    name: "lash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 2 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [6, 11], size: [0.42, 0.12],
                    color: 0xE4DAFA, alpha: [0.85, 0], light: "full", maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "overreach", bind: "source", offset: [0, 0.3, 0.6], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.7, thickness: 0 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x7C6BA8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragontail", 1, DragonTailDefinition);
