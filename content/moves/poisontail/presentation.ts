/**
 * 毒尾 / poisontail 的客户端表现。
 *
 * 一句话：施法者低身、毒在真实的背后聚成一串（起），随后一条贴地的尾段从身后扫过——低矮的毒绿弧面逐刻铺开，
 *   扫到的人身上炸开一撮毒液、被顺带扫开，尾梢抹上毒的人身上再慢慢渗出一圈绿痕（毒）。
 * 色相家族：毒绿（0x9BE86B 主体、0xD7F5A8 高光）＋深紫（0x6B4E8A 尾梢与余韵）；没有第二个色相。
 * 拍子：起 coil（聚毒）→ 扫 sweep（贴地尾段逐刻扫过）→ 中 sting（逐目标毒击）→ 毒 venom（渗毒）／空 miss。
 * 范围：sweep 每个条目由服务端发送**当前这一小段**低弧的三个顶点（轴心 + 被墙截短后的前后外缘端点）；
 *   服务端用同一组顶点判定 `WorldGeometry.bodyPolygon`，画面用同一组顶点铺面，所以画到哪就打到哪，墙后不画。
 * 运动：聚毒沿 `data.direction`（真实背后）摆放；扫击是贴着地面、脚踝高度的尾段逐刻推进，与向前推进的水流尾／龙尾区分开。
 * 数：`data.drops`（物攻派生）绑定扫过时甩出的毒滴数量，`data.intensity`（威力换算）驱动弧面密度，与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PoisonTailDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    // 毒聚在施法者真实的背后（data.direction）：沿这条短线生成、再向内收拢到尾部。
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 12 }, interval: 3, repeats: 3 },
                    shape: { kind: "line", length: 0.4 }, orient: "direction",
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "sheen", bind: "source", offset: [0, 0.3, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "line", length: 0.4 }, orient: "direction",
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.06, 0.01],
                    color: 0xD7F5A8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    // 当前这一小段低弧的铺面：服务端每刻换上的同一组顶点，逐刻推进而非整扇同时铺开。
                    name: "slice", bind: "path", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "drops", fallback: 12 },
                    shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.14], spread: 14, gravity: 0.02,
                    lifetime: [5, 11], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x6B4E8A, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    // 尾段本身的绿色外缘；sizeMode index 让越靠尾梢越亮，尾尖才是抹毒的那一段。
                    name: "tail", bind: "path", fit: "none", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "drops", fallback: 12 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.18],
                    lifetime: [6, 13], size: [0.06, 0.2], sizeMode: "index",
                    color: 0x9BE86B, alpha: [0.9, 0], light: "full", bloom: 0.22, maxParticles: 100
                }
            ]
        },
        sting: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wound", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.22], spread: 20,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 30
                },
                {
                    name: "splash", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 12 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        venom: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "seep", bind: "target", height: 0.35, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x9BE86B, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 17], size: [0.2, 0.05],
                    color: 0x6B4E8A, alpha: [0.55, 0], light: "world", maxParticles: 8
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "overreach", bind: "point", fit: "none", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.6, thickness: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8FA86B, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisontail", 1, PoisonTailDefinition);
