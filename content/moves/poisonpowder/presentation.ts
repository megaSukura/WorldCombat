/**
 * 毒粉 / Poison Powder 的客户端表现。
 *
 * 一句话：施法者掌心拢起一小撮黄绿毒尘，低弧抛出去，落地炸开一片毒尘，把圈里每个人糊上一层，然后很快散去、
 *   什么都不留下。
 * 色相家族：黄绿（0x9BE04A）与暗苔绿（0x6E8A3A）撑起粉团与毒尘，乳黄高光（0xD8F0A0）做边缘；
 *   中毒身份只在被毒上的人身上小小地亮一下（毒泡泡），读起来是「只有结果，没有残骸」。
 * 拍子：起（windup 拢粉）→ 掷（throw 粉团低弧飞出）→ 散（scatter 落地炸开）→ 收（poisoned 被毒上的人身上冒泡）。
 * 范围：scatter 绑在落点上、按 `data.scale`（实际半径 ÷ 参考半径 1.5）缩放球形覆盖——画出的那圈就是判定圈；
 *   炸完没有 linger 阶段，画面干净收起，与「不留东西」的机制一致。
 * 运动：粉团沿低弧飞向落点；落点处毒尘向外一炸随即下沉。
 * 数：服务端把 `motes`（尘粒数，随特攻与等级）交给发射器，炸开的毒尘密度与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PoisonPowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.2, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.03], spin: 14,
                    color: 0x9BE04A, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        },
        throw: {
            duration: 50,
            exit: { stop: 50, drain: 10 },
            emitters: [
                {
                    name: "puff", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 20, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.08 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [7, 14], size: [0.1, 0.03], spin: 16,
                    color: 0x9BE04A, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "puff_motes", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, trail: { minDistance: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xD8F0A0, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        scatter: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "dust_burst", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 55, drag: 0.9, gravity: 0.006,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 16,
                    color: 0x9BE04A, alpha: [0.85, 0], light: "world", maxParticles: 100
                },
                {
                    name: "dust_bubbles", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.92,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0x6E8A3A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.18, 0.07],
                    color: 0xD8F0A0, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        poisoned: {
            duration: 22,
            exit: { stop: 11, drain: 14 },
            emitters: [
                {
                    name: "settle", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0x7FA83C, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "settle_dust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [10, 18], size: [0.09, 0.03], spin: 12,
                    color: 0x9BE04A, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisonpowder", 1, PoisonPowderDefinition);
