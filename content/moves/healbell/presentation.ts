/**
 * 治愈铃声 / Heal Bell 的粒子语言。
 *
 * 一句话：身侧先收拢一圈铃音（windup）→ 一声清亮的声波以身体为心向外扩成圆环（peal，连着响数声）→
 *   只对被真正洗掉病痛的对象，在其身上亮起一根净光柱（cleanse）→ 余韵轻轻落下（fade）。
 * 色相家族：清透蓝白 0xCFE8FF 作主体，近白 0xF2FBFF 作高光，被震散的病痛用低饱和暗紫 0x8A6BB0 画小面积。
 * 拍子：起 windup 0–14t ／ 击 peal 0–26t（每声一次）／ 净 cleanse 0–22t（每个真正净化的对象一次）／ 收 fade 0–30t。
 * 范围：peal 的圆环绑 point、fit none，几何按 data.scale = 实际铃声半径 / 5.0 缩放，玩家站在环外就明白不会被洗到；
 *   cleanse 绑 target、按对象体型贴合，只在成功清除时由服务端发射。
 * 数：peal 的铃光数绑 data.motes（特防与体型派生），cleanse 的光柱强度绑 data.intensity、碎屑数绑 data.removed（实际洗掉的项数）。
 */
const HealBellDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xCFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_mote", bind: "source", offset: [0, 0.35, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xF2FBFF, alpha: [0.9, 0], light: "full", maxParticles: 26
                }
            ]
        },
        peal: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "peal_ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 3, interval: 3 }, shape: { kind: "ring", radius: 5.0 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.3, 0.9], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "peal_wash", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 30, shape: { kind: "circle", radius: 5.0 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.08, 0.01],
                    color: 0xCFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "peal_spark", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.22], drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.015],
                    color: 0xF2FBFF, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        cleanse: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "cleanse_pillar", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 4, interval: 3, repeats: 4 }, shape: { kind: "cylinder", radius: 0.34, length: 2.0, thickness: 1.0 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.2, 0.03],
                    color: 0xF2FBFF, alpha: [0.85, 0], light: "full", maxParticles: 26
                },
                {
                    name: "cleanse_spark", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 2, repeats: 4 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.015],
                    color: 0xCFE8FF, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "cleanse_malaise", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 2, repeats: 5 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 24], size: [0.11, 0.02],
                    color: 0x8A6BB0, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fade_halo", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "circle", radius: 5.0, thickness: 0.9 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [18, 30], size: [0.16, 0.04], alphaMode: "sin",
                    color: 0xCFE8FF, alpha: [0.22, 0.02], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_healbell", 1, HealBellDefinition);
