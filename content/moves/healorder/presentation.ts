/**
 * 回复指令 / Heal Order 的粒子语言。
 *
 * 一句话：施法者身边亮起一圈召唤的光，一群虫形手下绕着它飞，引导结束时每只把一团暖光交回施法者身上。
 * 色相家族：蜜蜡琥珀 0xF2C14E 作主体，暖白 0xFFF3C4 作高光与治疗，深褐 0xB07A2E 只作余韵。
 * 拍子：起（windup）／召（summon）／引（channel）／交（deliver）／散（spent）。
 * 数目：summon 的爆发数绑定 data.burst = 手下面数 × 8；每只手下自己的一份 channel 场景由它的实体撑起，
 *   所以画面里同时看到几个光点就等于还有几只手下在引导。channel 的粒子大小按 data.size 随精锐档位放大。
 */
const HealOrderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "windup_ring", bind: "source", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.32, 0.12],
                    color: 0xF2C14E, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        summon: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "summon_burst", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.9,
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0xF2C14E, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "summon_ring", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 }, shape: { kind: "circle", radius: 1.6 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.34, 0.8],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", maxParticles: 18
                },
                {
                    name: "summon_mote", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 24, repeats: 2, interval: 5 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        channel: {
            exit: { drain: 18 },
            emitters: [
                {
                    name: "fly_core", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 6, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.005, 0.02], spin: 6,
                    lifetime: [14, 24], size: { data: "size", fallback: 0.16 },
                    color: 0xF2C14E, alpha: [0.9, 0.1], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 12
                },
                {
                    name: "fly_dust", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        deliver: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "deliver_burst", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "burst", fallback: 16 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [8, 16], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", maxParticles: 40
                },
                {
                    name: "deliver_heal", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        spent: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spent_mote", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xB07A2E, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_healorder", 1, HealOrderDefinition);
