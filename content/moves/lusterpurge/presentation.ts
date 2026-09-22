/**
 * 洁净光芒 / lusterpurge —— 客户端表现。
 *
 * 一句话：强光在施法者身前收成一点、越收越亮 → 在它身上炸开、光幕从脚边向外一圈圈铺开 → 被照到的每个敌人
 * 身上闪一记炫目亮点 → 触发碾防的目标身上残留一圈亮点，最后光幕淡出。
 * 色相家族：洁净的暖白与浅金（0xFFF3C4 / 0xFFE9A8），彩虹闪片只给炸开的一瞬。
 * 拍子：起 windup（聚光）→ 放 flash（炸开）与 wave（铺开）→ 击 hit（每人一闪）→ 留 daze（炫目残留）→ 收 fade。
 * 范围：wave/fade 用服务端算出的 `data.scale`（光芒半径 / 参考 4.0）铺开，玩家一眼看出光幕盖住哪圈。
 * 运动：光幕从中心贴地向外扩张（服务端逐圈判定），没有飞行物。
 * 数：flash/wave 的光束数绑定 `data.rays`（特攻与等级换算），强度绑定 `data.intensity`（威力 / 90）。
 */
const LusterPurgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "charge_core", bind: "source", offset: [0, 0.2, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.2, 0.03],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "charge_sparkle", bind: "source", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        flash: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "flash_ring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.5, 1.6],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 8
                },
                {
                    name: "flash_rays", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.2, 0.6], spread: 18,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "flash_motes", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.1, 0.35], gravity: 0.01,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        wave: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wave_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.35, 1.0],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "wave_rays", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    rate: { data: "rays", fallback: 10 }, shape: { kind: "cylinder", radius: 0.9, length: 0.3 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [8, 14], size: [0.2, 0.4],
                    color: 0xFFE9A8, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "hit_sparkle", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        daze: {
            duration: 150,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "daze_halo", bind: "target", offset: [0, 0.5, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow", spriteFrom: "age",
                    rate: 3, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0xFFF3C4, alpha: [0.6, 0.05], light: "full", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "fade_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.4, 1.2],
                    color: 0xFFE9A8, alpha: [0.45, 0], light: "world", maxParticles: 6
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lusterpurge", 1, LusterPurgeDefinition);
