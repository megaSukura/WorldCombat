/**
 * 惊吓 / astonish 的客户端表现。
 *
 * 一句话：目标脸上突然炸开一圈苍白的尖叫波与一个巨大的“！”，随即幽紫的阴气迸溅；被吓懵的人头顶浮起惊惶星点。
 * 色相家族：幽紫（0x8A7AB8）与苍白的惊吓白（0xEDE8FF）；饱和色只出现在“！”与尖叫核心一点。
 * 拍子：呼 scream（瞬发峰值）→ 击 hit → 懵 flinch；没有起手拍，这正是这招的身份。
 * 范围：scream 绑尖啸落点，波环画出的就是能吓到的范围；判定半径来自 burst。
 * 运动：尖叫波从落点向外推一圈，阴气四散；惊惶星点从目标头顶向上飘。
 * 数：`data.fright`（畏缩几率 ×100）决定尖叫波的点数，`data.bang`（威力派生）决定阴气迸溅数，
 * `data.gloom`（黑暗 1/0）记录这一声是否在暗处叫的，`data.scale`（惊吓判定 / 0.38）放大波环与“！”。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const AstonishDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        scream: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shock_ring", bind: "point", offset: [0, 0.75, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: { data: "fright", fallback: 30 }, at: 1 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xEDE8FF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "shout_mark", bind: "point", offset: [0, 1.0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 2, at: 1, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1], spread: 8,
                    lifetime: [8, 13], size: [0.42, 0.08], sizeMode: "index",
                    color: 0xEDE8FF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 12
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ghost_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "bang", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8A7AB8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 52
                },
                {
                    name: "startle_fog", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    drag: 0.9,
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x6E5E96, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "jitters", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 12,
                    lifetime: [11, 17], size: [0.15, 0.04],
                    color: 0x8A7AB8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 22
                }
            ]
        },
        echo: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "wall_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xCFC6E2, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x9A93B8, alpha: [0.5, 0], light: "world", maxParticles: 34
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty_call", bind: "source", offset: [0, 0.6, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xCFC6E2, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_astonish", 1, AstonishDefinition);
