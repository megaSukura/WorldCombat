/** Surface cues use the observed open fluid surface; underwater relocation has bubbles only. Owned wake emission follows actual travel, and a breach splash is sent only after real emergence. */
const DiveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：水面翻涌、向内收的水环与上浮气泡，是可打断的下潜预告。
        submerge: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "submerge_ring", bind: "point", fit: "world", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 18, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.44, 0.14],
                    color: 0x8FD8F0, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "submerge_core", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xBFEAF8, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "submerge_bubbles", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 12, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: [0.09, 0.02],
                    color: 0xBFEAF8, alpha: [0.7, 0], light: "world", maxParticles: 36
                }
            ]
        },
        // 行：水痕本体。服务端每刻 keep 在新的位置，所以它就是"水正冲到哪"这条可读的线。
        wake: {
            duration: 0,
            exit: { stop: 0, drain: 6 },
            emitters: [
                {
                    name: "wake_ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 18, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [4, 6], size: [0.34, 0.12],
                    color: 0x8FD8F0, alpha: [0.55, 0], light: "world", maxParticles: 20
                },
                {
                    name: "wake_spray", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.14], gravity: 0.07,
                    lifetime: [4, 6], size: [0.07, 0.01],
                    color: 0xEAF8FF, alpha: [0.7, 0], light: "world", maxParticles: 24
                },
                {
                    name: "wake_bubbles", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 6, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [4, 6], size: [0.07, 0.01],
                    color: 0xBFEAF8, alpha: [0.6, 0], light: "world", maxParticles: 16
                }
            ]
        },
        // 击：窜出水面。
        surface: {
            duration: 28,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "surface_ring", bind: "point", fit: "world", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "torus", radius: 0.65, thickness: 0.22 },
                    direction: "outward", speed: [0.14, 0.34],
                    lifetime: [10, 18], size: [0.42, 0.95],
                    color: 0x8FD8F0, alpha: [0.7, 0], light: "world"
                },
                {
                    name: "surface_column", bind: "point", fit: "world", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 18, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 0.42 },
                    direction: "up", speed: [0.24, 0.52], gravity: 0.09, spin: 24,
                    lifetime: [16, 30], size: [0.17, 0.04],
                    color: 0xEAF8FF, alpha: [0.95, 0], light: "world", maxParticles: 44
                },
                {
                    name: "surface_foam", bind: "point", fit: "world", offset: [0, 0.22, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    burst: { count: 18, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.09, 0.22],
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xD8F2FF, alpha: [0.8, 0], light: "world", maxParticles: 52
                }
            ]
        },
        underwater: {
            duration: 16, exit: { stop: 0, drain: 12 },
            emitters: [{ name: "rest_bubbles", bind: "point", fit: "world",
                particle: "world_combat_core:cobblemon/generic/bubble/smallbubble", burst: { count: 6 },
                shape: { kind: "sphere", radius: .2 }, direction: "up", speed: [.02, .05],
                lifetime: [8, 12], size: [.08, .02], color: 0xBFEAF8, alpha: [.5, 0] }]
        },
        // 击：命中并顶飞。scale 随窜出判定半径放大，把"这一下能罩多宽"画出来。
        impact: {
            duration: 30,
            exit: { stop: 10, drain: 26 },
            emitters: [
                {
                    name: "impact_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.55 },
                    direction: "outward", speed: [0.09, 0.24],
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [1, 0], light: "full"
                },
                {
                    name: "impact_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.38, 0.14],
                    color: 0x8FD8F0, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "impact_column", bind: "target", offset: [0, 0.2, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 16, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.22, 0.5], gravity: 0.1, spin: 30,
                    lifetime: [14, 26], size: [0.15, 0.03],
                    color: 0xEAF8FF, alpha: [0.9, 0], light: "world", maxParticles: 34
                },
                {
                    name: "impact_drops", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/water/fishsplash",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.11, 0.3], gravity: 0.09, spin: 90,
                    lifetime: [12, 24], size: [0.1, 0.02],
                    color: 0xBFEAF8, alpha: [0.9, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // 收：扑空只是一小团散开的水花，让"白跑一趟"看得出来。
        whiff: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "whiff_splash", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.15], gravity: 0.06,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xBFEAF8, alpha: [0.5, 0], light: "world", maxParticles: 18
                },
                {
                    name: "whiff_bubbles", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xD8F2FF, alpha: [0.4, 0], light: "world", maxParticles: 10
                }
            ]
        },
        // 非战斗：在水里下潜浇灭自身灼伤，冒起一小团白汽。
        douse: {
            duration: 26,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "douse_steam", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 7, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 28], size: [0.2, 0.34],
                    color: 0xE8F6FF, alpha: [0.5, 0], light: "world", maxParticles: 16
                },
                {
                    name: "douse_beads", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.09,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xBFEAF8, alpha: [0.7, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dive", 1, DiveDefinition);
