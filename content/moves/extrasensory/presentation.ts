/**
 * 神通力 / extrasensory 的客户端表现。
 *
 * 一句话：选定的点上先浮起一道几乎看不清的念力幻影（微微扭曲的紫环），一直悬着不动；延迟到点后，看不见的力
 * 从四面猛地向中心收拢，把那块地攥成一记紫白内爆，被攥住的人身上收束一圈暗紫。
 * 色相家族：暗紫与淡紫（psyring / psyswirl / impact_psychic 为主体，0xC6A9F0、0x8A6AC8），近白只给合拢核心。
 * 拍子：起（mark 幻影悬停在点上，长而淡）→ 攥（snap 向内收拢的内爆）→ 中（hit 逐个被攥住）→ 懵（flinch）／空（miss）。
 * 范围：mark 与 snap 的紫环都按服务端传的 `data.radius`（真实合拢半径）画出，玩家看到的圈就是会被攥住的地。
 * 运动：起手幻影几乎静止、只缓慢旋转；合拢时四面向内收束并向下压；命中时暗紫环从外朝内收一圈。
 * 数：`data.motes`（特攻与等级派生）决定力丝的密度，`data.delay` 让幻影的存在时长可读，`data.intensity` 抬高合拢亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const ExtrasensoryDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 40,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 12, shape: { kind: "ring", radius: { data: "radius", fallback: 1.7 } },
                    direction: "inward", speed: [0.01, 0.04], spin: 6, orient: "fixed",
                    lifetime: [14, 24], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xB69AE0, alpha: [0.28, 0], light: "world", maxParticles: 40
                },
                {
                    name: "mark_warp", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 6, shape: { kind: "sphere", radius: { data: "radius", fallback: 1.7 } },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.18, 0.03],
                    color: 0xC6A9F0, alpha: [0.18, 0], light: "world", maxParticles: 24
                }
            ]
        },
        snap: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "snap_pull", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.7 } },
                    direction: "inward", speed: [0.25, 0.7], spread: 14, spin: 20,
                    lifetime: [8, 14], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xC6A9F0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "snap_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.7 } },
                    direction: "inward", speed: [0.1, 0.35],
                    lifetime: [10, 16], size: [0.3, 0.5], sizeMode: "linear",
                    color: 0x8A6AC8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "snap_core", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.05, 0.2], spread: 18,
                    lifetime: 8, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "hit_grip", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "ring", radius: 0.5 }, direction: "inward", speed: [0.08, 0.3],
                    lifetime: [8, 14], size: [0.22, 0.4], sizeMode: "linear",
                    color: 0x8A6AC8, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "hit_spark", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 }, direction: "outward", speed: [0.05, 0.22], spread: 18,
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF0E8FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                }
            ]
        },
        flinch: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xE0D0FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 28
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "miss_fade", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.7 }, thickness: 0.9 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x9A7CD0, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_extrasensory", 1, ExtrasensoryDefinition);
