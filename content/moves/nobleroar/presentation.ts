/**
 * 战吼 / nobleroar 的客户端表现。
 *
 * 一句话：施法者挺胸吸气、脚下卷起一圈风 → 一声低吼，一圈锥形声压从正面推出去，贴着地面铺满整片锥面，
 * 气流边缘卷着金白的声纹 → 被吼到的人身上，光点顺着身体往下沉、脚边腾起一小股尘，额前压下一枚短符。
 * 色相家族：暗金 0xC9A24A 与金白 0xFFE9A8 为主体，土黄 0xD8B060 作被压者的细节；烟尘层压到近黑。
 * 拍子：起（gather 0–12t）→ 击（roar 0–30t）→ 中（cowed 逐目标 0–26t）→ 收（settle）。
 * 范围：roar 的锥形地面顶点即判定用的锥面（`data.path`），铺到哪就是会被吼到的地；锥体沿 `data.direction` 张开，
 *   与 `WorldGeometry.sector` 读同一组 origin/heading/reach/arc。
 * 运动：声压沿锥轴向外推、沿着顶点连线填满锥面；被压者的光点往下沉、短符从上压下。
 * 数：声浪量绑 `data.volume`（体重派生），锥的张角绑 `data.halfArc`，锥长按 5 格参考值书写、
 *   由服务端 `data.scale = reach / 5` 缩放到机制射程，掉级绑 `data.cow`，短符次数绑 `data.cow`。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const NobleRoarDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "inhale", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12], spin: 8,
                    lifetime: [8, 16], size: [0.2, 0.05],
                    color: 0xC9A24A, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        roar: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "cone_air", bind: "source", offset: [0, 0, 0], height: 0.7, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "volume", fallback: 30 },
                    shape: { kind: "cone_volume", radius: 0.35, length: 5, angleDegrees: { data: "halfArc", fallback: 35 } },
                    direction: "shape", speed: [0.08, 0.26], spread: 8, spin: 10,
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0xC9A24A, alpha: [0.35, 0], light: "world", maxParticles: 320
                },
                {
                    name: "cone_fill", bind: "path", offset: [0, -0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    shape: { kind: "polygon" },
                    rate: { data: "volume", fallback: 30 }, direction: "shape", speed: [0.05, 0.2], spread: 20,
                    lifetime: [7, 14], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.7, 0], light: "full", maxParticles: 360
                },
                {
                    name: "cone_edge", bind: "path", offset: [0, -0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polyline", closed: true },
                    rate: 44, direction: "shape", speed: [0.08, 0.26], spread: 10,
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xFFF3C4, alpha: [0.75, 0], light: "full", maxParticles: 260
                },
                {
                    name: "ground_dust", bind: "path", offset: [0, -0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "volume", fallback: 30 }, direction: "outward", speed: [0.03, 0.12],
                    drag: 0.94, gravity: 0.01,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0x9A7A40, alpha: [0.45, 0], light: "world", maxParticles: 220
                },
                {
                    name: "throat", bind: "source", offset: [0, 0.78, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 24
                }
            ]
        },
        cowed: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "sink", bind: "target", offset: [0, 0, 0], height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "cow", fallback: 1 }, interval: 2, repeats: 6 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xD8B060, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shrink_puff", bind: "target", offset: [0, 0, 0], height: 0.08, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0x6A5A38, alpha: [0.35, 0], light: "world", maxParticles: 30
                },
                {
                    name: "press", bind: "target", offset: [0, 0, 0], height: 0.42, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: { data: "cow", fallback: 1 }, at: 2 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.01,
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xE8C860, alpha: [0.85, 0], light: "full", maxParticles: 20
                }
            ]
        },
        settle: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dust_settle", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A7248, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nobleroar", 1, NobleRoarDefinition);
