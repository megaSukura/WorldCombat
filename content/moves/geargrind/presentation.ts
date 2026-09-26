/**
 * 齿轮飞盘 / geargrind 的客户端表现。
 *
 * 一句话：施法者身上旋起两枚钢齿轮，一左一右交错甩出，各拖一条笔直的钢色尾迹扑向对手；命中处炸开一撮钢屑，
 *   打空的齿轮在落点弹一下、原地转一会儿再散开。
 * 色相家族：冷钢灰（0x9AA4AE、0xC9D4DE）做齿轮与尾迹，白（0xFFFFFF）只给命中那一抹；微微的暖火星只作细节。
 * 拍子：起 load（上弦）→ 一/二 throw（从两侧甩出）→ 中 hit（真实碰点）→ 擦 clatter（按命中面弹开）→ 留 grounded（快速散成钢屑）。
 * 范围：throw 的尾迹沿 `data.direction` 从该侧出手点铺开；hit 用真实碰点 `data.point`；clatter 沿反弹方向 `data.direction` 画一段弹开轨迹。
 * 运动：齿轮本体由中间实体外观绘制；两枚从左右侧位分别甩出（`data.side`），hit 的钢屑在真实碰点向外炸。
 *   grounded 只转一小会儿就散成钢屑，`data.linger` 绑定时长——不是会持续伤人的长齿轮。
 * 数：`data.shards`（物攻派生）绑定发射量，`data.intensity`（每枚威力派生）抬高亮度，`data.cross` 区分交错/直射。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const GeargrindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        load: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "wind", bind: "source", offset: [0, 0.55, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "shards", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 0.7 }, direction: "outward", speed: [0.05, 0.2], spin: 10,
                    lifetime: [7, 12], size: [0.14, 0.03],
                    color: 0xC9D4DE, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        throw: {
            duration: 18,
            exit: { drain: 9 },
            emitters: [
                {
                    name: "streak", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "line", length: 1.6 },
                    direction: "shape", speed: [0.12, 0.34], spread: 6, drag: 0.94,
                    lifetime: [6, 11], size: [0.1, 0.02],
                    color: 0x9AA4AE, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "flash", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.08, 0.34], spread: 26,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.38, maxParticles: 54
                },
                {
                    name: "spall", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "shards", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.12, 0.4], spread: 30, gravity: 0.06,
                    lifetime: [9, 15], size: [0.1, 0.02],
                    color: 0x9AA4AE, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        clatter: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "bounce", bind: "point", offset: [0, 0.12, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "line", length: 0.9 },
                    direction: "shape", speed: [0.1, 0.3], spread: 8, drag: 0.94,
                    lifetime: [5, 9], size: [0.09, 0.02],
                    color: 0x9AA4AE, alpha: [0.6, 0], light: "world", maxParticles: 34
                },
                {
                    name: "spark", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "hemisphere", radius: 0.24 }, direction: "outward", speed: [0.06, 0.24], spread: 30, gravity: 0.1,
                    lifetime: [6, 11], size: [0.1, 0.02],
                    color: 0xC9D4DE, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        grounded: {
            duration: { data: "linger", fallback: 14 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "disc", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [8, 12], size: [0.14, 0.04],
                    color: 0x9AA4AE, alpha: [0.4, 0], light: "world", maxParticles: 18
                },
                {
                    name: "chips", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.03, 0.14], spread: 30, gravity: 0.08, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xC9D4DE, alpha: [0.5, 0], light: "full", bloom: 0.16, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_geargrind", 1, GeargrindDefinition);
