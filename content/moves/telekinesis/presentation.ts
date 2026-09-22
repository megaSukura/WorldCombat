/**
 * 意念移物 / telekinesis 的客户端表现。
 *
 * 一句话：一道念力从施法者射向对手、在它脚下盘成一圈圈的环 → 环收拢把它的身体托离地面、向上抬起（强环＋螺旋）→
 *   悬着的几秒里环在它身下极慢地转，表示「还抬着」；念力松开时环落下褪去，若被硬切则环碎成落屑。
 * 色相家族：深紫 0x8A5CF0 作主体，淡紫白 0xE6DCFF 作高光，环缘留一点青白 0x7FE8FF。
 * 拍子：起（gather 0–16t）→ 击（hoist 0–30t，托起）→ 存（hover 持续）→ 收（settle／cut 0–30t）。
 * 范围：gather/hoist 的念力束绑 `data.path`（施法者与目标两个实体顶点画的 polyline），画的就是「从多远抬起」；
 *   环与压制光绑目标身体，settle/cut 绑目标，negate 打在被免掉的地面伤害落点上。
 * 运动：环从脚下收拢 → 向上抬升并向外张开 → hover 极慢自转 → settle 下落褪去 / cut 碎落。
 * 数：环数绑 `data.rings`（特攻派生），托起强度绑 `data.intensity`（压制程度派生），落环半径绑 `data.scale`。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const TelekinesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "gather_beam", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "rings", fallback: 8 }, direction: "shape", speed: [0.05, 0.16], spread: 6,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8A5CF0, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "gather_ring", bind: "target", fit: "body", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 10, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xE6DCFF, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        hoist: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hoist_column", bind: "target", fit: "body", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "rings", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "cylinder", radius: 0.45, length: 1.4 },
                    direction: "up", speed: [0.12, 0.32], spin: 40,
                    lifetime: [9, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0x8A5CF0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "hoist_lift_ring", bind: "target", fit: "body", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.35, 0.95], sizeMode: "sin",
                    color: 0xE6DCFF, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "hoist_spark", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "rings", fallback: 8 }, at: 4 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7FE8FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 90
                }
            ]
        },
        hover: {
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "hover_ring", bind: "target", fit: "body", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "rings", fallback: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.004, 0.014], spin: 12,
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8A5CF0, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 40
                },
                {
                    name: "hover_beam", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: 4, direction: "shape", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0xE6DCFF, alpha: [0.28, 0], light: "full", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "settle_ring", bind: "target", fit: "body", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.26, 0.05],
                    color: 0xE6DCFF, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "settle_drift", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x8A5CF0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        cut: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cut_shard", bind: "target", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.08, 0.26], gravity: 0.05,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE6DCFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cut_smoke", bind: "target", fit: "body", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.3],
                    color: 0x8A8172, alpha: [0.25, 0], light: "world", render: "translucent", maxParticles: 16
                }
            ]
        },
        negate: {
            duration: 28,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "negate_ring", bind: "target", fit: "body", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.3, 0.9], sizeMode: "sin",
                    color: 0x7FE8FF, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_telekinesis", 1, TelekinesisDefinition);
