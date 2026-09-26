/**
 * 愤怒之拳 / ragefist 的客户端表现。
 *
 * 一句话：拳上按拳印聚起暗红怒气 → 每一记鬼拳都从拳面沿真实拳路甩出一只虚影拳头、在首碰点炸开鬼色冲击
 *   与一簇怒气 → 挨打时拳上再窜起一簇怒气（拳印 +1）→ 拳印散尽时余怒褪去；空拳只在拳路尽头散尘，不在原目标身上冒光。
 * 色相家族：血怒红（0xB23A4E 主体 / 0xE8B0C0 高光）压着鬼紫（0x8A3A6A 作虚影拳与冲击），暗底近黑 0x2E1A28。
 * 拍子：起 coil（0–8t 聚怒）→ 拳 punch × `fists`（一记 Event 一只拳，沿 `data.path` 走短拳路）→
 *   空 whiff（拳路尽头）／挡 blocked（伤害被拒）→ 攒 stack／守 aura → 收 fade／miss。
 * 范围：每一记拳绑真实首碰点，拳影与冲击画在被打中的那一身上；这是一串贴身拳，没有铺开的地面区域。
 * 运动：punch 的虚影拳沿 `data.path`（拳面→首碰点）拉出短拳路，再在首碰点向外炸开；stack 的怒气向上窜起。
 * 数：punch 的**事件数就是出拳数 `fists`**（机制里真正结算的次数），每记拳的怒气量绑 `data.plumes`
 *   （拳印数派生）、冲击强度绑 `data.intensity`（每拳威力 / 24）；攒印与守印的怒气量也随 `data.stored` 走。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const RageFistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 9,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "anger", bind: "source", offset: [0, 0.05, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: { data: "plumes", fallback: 8 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xE8B0C0, alpha: [0.8, 0], light: "full", maxParticles: 50
                },
                {
                    name: "knuckles", bind: "source", offset: [0, 0.05, 0], height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xB23A4E, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        punch: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fist", bind: "target", offset: [0, 0.15, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.14, 0.36], spin: 6,
                    lifetime: [6, 11], size: [0.5, 0.34], sizeMode: "linear",
                    color: 0x8A3A6A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "fist_path", bind: "path", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    shape: { kind: "polyline" },
                    rate: 48, direction: "shape", speed: [0.06, 0.2], spread: 8, spin: 8,
                    lifetime: [5, 9], size: [0.42, 0.22], sizeMode: "linear",
                    color: 0x8A3A6A, alpha: [0.9, 0], light: "full", bloom: 0.3,
                    burst: { count: 3, at: 0 }, maxParticles: 40
                },
                {
                    name: "impact", bind: "target", offset: [0, 0.18, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xE8B0C0, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "anger", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "plumes", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spin: 8,
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0xB23A4E, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        blocked: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "dull", bind: "target", offset: [0, 0.18, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.14], spin: 4,
                    lifetime: [5, 9], size: [0.34, 0.2], sizeMode: "linear",
                    color: 0x2E1A28, alpha: [0.7, 0], light: "world", maxParticles: 6
                },
                {
                    name: "nospark", bind: "target", offset: [0, 0.22, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0x8A3A6A, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        },
        whiff: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "plumes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xE8B0C0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        stack: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "mark", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "plumes", fallback: 10 }, at: 0 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.05, 0.2],
                    lifetime: [8, 15], size: [0.14, 0.02],
                    color: 0xE8B0C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "knuckle", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.34, 0.18], sizeMode: "linear",
                    color: 0xB23A4E, alpha: [0.8, 0], light: "full", maxParticles: 6
                }
            ]
        },
        aura: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "simmer", bind: "source", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: { data: "plumes", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xB23A4E, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "embers", bind: "target", offset: [0, 0.08, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.18, 0.03],
                    color: 0x8A3A6A, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.06, 0.01],
                    color: 0xE8B0C0, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ragefist", 1, RageFistDefinition);
