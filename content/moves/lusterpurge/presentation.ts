/**
 * 洁净光芒 / lusterpurge —— 客户端表现（重做）。
 *
 * 一句话：强光在施法者身前收成一条细亮芯 → 光束朝瞄准方向先以窄芯存在、再由芯向两侧张开成一个有限光扇 →
 *   被照到的每个敌人身上闪一记炫目亮点 → 触发碾防的目标身上只留一记很短的亮点，最后光扇淡出。
 * 色相家族：洁净的暖白与浅金（0xFFF3C4 / 0xFFE9A8），彩虹闪片只给张开的一瞬。
 * 拍子：起 windup（聚芯）→ 放 beam（窄芯张成光扇）→ 击 hit（每人一闪）→ 留 mark（短亮点）→ 收 fade。
 * 范围：beam 用与判定同一份 `data.direction`／`data.length`／`data.angle` 画扇面，玩家一眼看出站在哪块扇里会被照到；
 *   光扇张角随时间由窄到宽，与被 trace 截光、逐 tick 判定的过程一致。
 * 运动：光束固定朝 `data.direction`，施法者不移动、不追踪；墙面按判定结果截住能被照到的人。
 * 数：扇面与芯的密度绑定 `data.rays`（特攻与等级换算），亮度绑定 `data.intensity`（威力 / 90）。
 */
const LusterPurgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "charge_core", bind: "source", offset: [0, 0.25, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 28
                },
                {
                    name: "charge_sparkle", bind: "source", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 28
                },
                {
                    name: "charge_core_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam", shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.0, 0.03],
                    lifetime: [5, 9], size: 0.12,
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        core: { duration: 20, exit: { stop: 8, drain: 14 }, emitters: [
                {
                    name: "beam_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam", shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: 0.14,
                    color: 0xFFF3C4, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 100
                }
        ] },
        beam: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "beam_fan", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: 120, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.1, 0.3], spread: 10,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xFFE9A8, alpha: [0.55, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "beam_rays", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: { data: "rays", fallback: 8 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.15, 0.45], spread: 14,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "beam_muzzle", bind: "point", fit: "none", offset: [0, 0.55, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [8, 14], size: [0.4, 1.1],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 6
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "hit_sparkle", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "rays", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 44,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "mark_halo", bind: "target", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow", spriteFrom: "age",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.6, 0.05], light: "full", maxParticles: 10
                },
                {
                    name: "mark_flash", bind: "target", offset: [0, 0.15, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 1, at: 0 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 6, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 4
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.5, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.3, 0.9],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "world", maxParticles: 4
                },
                {
                    name: "fade_motes", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "rays", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.01,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lusterpurge", 1, LusterPurgeDefinition);
