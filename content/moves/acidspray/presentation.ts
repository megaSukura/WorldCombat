/**
 * 酸液炸弹 / acidspray —— 客户端表现。
 *
 * 一句话：酸滴从口边聚起 → 顺着身前一道短而宽的楔形喷出、扑在身前短短一截 → 被真正淋到（掉防）的目标身上溅开腐蚀光，
 * 余雾很快散掉，不在地面留下危险区。
 * 色相家族：酸蚀的黄绿（0x8FCB3A / 0xB7E05A），中性白只出现在喷口。
 * 拍子：起 windup（聚酸）→ 喷 spray（单次楔面）→ 击 hit（真实降防者溅开）。
 * 范围：喷淋面与残雾使用服务端按真实射程、整张角生成的同一份水平顶点（data.path）。
 * 运动：酸滴落在身前楔形内、短暂上浮后随退出 draining 迅速收干。
 * 数：喷出量绑定 `data.drops`（特攻与等级换算），强弱绑定 `data.intensity`（喷淋威力 / 38）。
 */
const AcidSprayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charge_drops", bind: "source", offset: [0, 0.3, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xB7E05A, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "charge_sheen", bind: "source", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xEAF7B8, alpha: [0.8, 0], light: "full", maxParticles: 18
                }
            ]
        },
        spray: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "spray_sheet", bind: "path", fit: "none", offset: [0, 0.32, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 14 }, interval: 1, repeats: 2 },
                    shape: { kind: "polygon" },
                    direction: "up", speed: [0.04, 0.1], spread: 12,
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0x8FCB3A, alpha: [0.95, 0], gravity: 0.03, light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "spray_mist", bind: "path", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "drops", fallback: 14 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xB7E05A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_burst", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "hit_splash", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "drops", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.05,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x8FCB3A, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_acidspray", 1, AcidSprayDefinition);
