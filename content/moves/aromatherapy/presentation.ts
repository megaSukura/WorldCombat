/**
 * 芳香治疗 / Aromatherapy 的粒子语言。
 *
 * 一句话：手心拢起一捧香（windup）→ 香雾沿瞄准线撒到落点、落地漫成一片低伏的香云（release / settle）→
 *   云留在地上慢慢飘，谁走进来，身上的病痛就被香气化成粉色花瓣卷走（cloud / cleanse）。
 * 色相家族：柔粉 0xF6C7E0 作香云主体，新绿 0xA8DFA0 作飘走的花叶细节，被化掉的病痛用低饱和暗紫 0x8A6BB0 画小面积。
 * 拍子：起 windup 0–14t ／ 铺 release 0–26t、settle 0–30t ／ 留 cloud 持续 ／ 净 cleanse 0–24t。
 * 范围：settle 与 cloud 的圆环绑 point、fit none，几何按 data.scale = 实际香云半径 / 3.0 缩放，云边即判定边。
 * 数：release/cloud 的香雾数与 settle 的落点爆量绑 data.motes（特防与体型派生），净化花瓣数绑 data.removed（本次化掉的项数）。
 */
const AromatherapyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather_scent", bind: "source", offset: [0, 0.4, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 20, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xF6C7E0, alpha: [0.8, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_petal", bind: "source", offset: [0, 0.35, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.05], spin: 6,
                    lifetime: [10, 16], size: [0.14, 0.04],
                    color: 0xA8DFA0, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "release_jet", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 70, shape: { kind: "line", length: { data: "distance", fallback: 3 } },
                    direction: "shape", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xF6C7E0, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "release_petal", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 20, shape: { kind: "line", length: { data: "distance", fallback: 3 } },
                    direction: "shape", speed: [0.03, 0.09], spin: 8,
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xA8DFA0, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "settle_ring", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 4 }, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.3, 0.78], sizeMode: "sin",
                    color: 0xF6C7E0, alpha: [0.75, 0], light: "full", maxParticles: 20
                },
                {
                    name: "settle_mote", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xF6C7E0, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        cloud: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "cloud_body", bind: "point", offset: [0, 0.18, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    rate: 12, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [30, 50], size: [0.36, 0.1], alphaMode: "sin",
                    color: 0xF6C7E0, alpha: [0.28, 0.02], light: "world", maxParticles: 60
                },
                {
                    name: "cloud_edge", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, shape: { kind: "circle", radius: 3.0, thickness: 0.92 },
                    direction: "up", speed: [0.003, 0.01],
                    lifetime: [24, 40], size: [0.12, 0.04], alphaMode: "sin",
                    color: 0xF6C7E0, alpha: [0.24, 0.02], light: "world", maxParticles: 30
                },
                {
                    name: "cloud_petal", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 4, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.005, 0.02], spin: 5, gravity: 0.004, drag: 0.98,
                    lifetime: [30, 50], size: [0.14, 0.03],
                    color: 0xA8DFA0, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        cleanse: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "cleanse_petal", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 2, repeats: 6 }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "outward", speed: [0.06, 0.18], spin: 8, drag: 0.9,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0xA8DFA0, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "cleanse_malaise", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 3, repeats: 4 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0x8A6BB0, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aromatherapy", 1, AromatherapyDefinition);
