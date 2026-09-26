/**
 * 十字毒刃 / crosspoison 的客户端表现。
 *
 * 一句话：两片毒刃在身前左右分开、刃口滴着毒（起），随即从两侧同时合拢、在对手身上剪出一个 X（剪），
 *   被两条刃共同覆盖的正中目标补上 X 成形的收束并真正中毒（合/毒）。
 * 色相家族：毒绿（0x9BE86B 刃口、0xD7F5A8 高光）＋深紫（0x6B4E8A 刃身与余韵）；没有第二个色相。
 * 拍子：起 spread（两刃分开聚毒）→ 剪 slit×2（两刃各划一条斜线，各自可被墙截短）→ 合 seal（交点双中）→ 中 cut → 毒 venom／空 miss。
 * 范围：slit 的两条斜线用服务端算出的 `data.path` 顶点（裁剪后的真实刃线）以 polyline 画出；判定与画面读同一组顶点
 *   （`data.spread` 决定交叉点张多开；`data.scale` 只服务端缩放粒子尺寸，不重复缩放这组世界顶点）；站在刃线外就划不到。
 * 运动：两刃**同时**从左右向中间收拢，交汇在落点——与十字劈先后落下的两劈在画面上截然不同。
 * 数：`data.drops`（物攻派生）绑定刃口与切口迸出的毒滴数量，`data.intensity`（威力换算）驱动亮度，与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const CrossPoisonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        spread: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "left", bind: "source", offset: [-0.4, 0.9, 0.3], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 10, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.08], gravity: 0.02,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0x6B4E8A, alpha: [0.8, 0], light: "world", maxParticles: 24
                },
                {
                    name: "right", bind: "source", offset: [0.4, 0.9, 0.3], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.08], gravity: 0.02,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        slit: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "blade", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: 120, direction: "shape", speed: [0.05, 0.22], spread: 10,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x9BE86B, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "venom", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "drops", fallback: 14 }, at: 0 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 15], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x6B4E8A, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        seal: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "x", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 10, at: 0, repeats: 2, interval: 3 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24], spread: 16,
                    lifetime: [6, 11], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "drip", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "drops", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.06, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 30
                },
                {
                    name: "spray", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 14 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        venom: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "mark", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x9BE86B, alpha: [0.75, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.16], spin: 6,
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0x6B8A5A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_crosspoison", 1, CrossPoisonDefinition);
