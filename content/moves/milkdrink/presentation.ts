/**
 * 喝牛奶 / Milk Drink 的粒子语言。
 *
 * 一句话：它仰头连饮，瓶口浮起一串乳白泡沫，奶滴顺着身体滑下化作暖光，最后一口清亮的水光把毒冲散。
 * 色相家族：乳白 0xFFFBF0 作奶与高光，浅奶蓝 0xDCEBF0 作泡沫与冲毒水光，淡金 0xE8D9A8 只作余韵。
 * 拍子：起（windup）／饮（open）／口（gulp，每口一次）／净（refresh，解毒时）／抹（wipe）。
 * 范围：作用于自己，绑 source（fit body）；冲毒一幕的水光半径绑定 data.clean（身高派生），一眼看出解毒波及的范围。
 * 机制驱动：每口溅起的奶滴数绑定 data.drops（体重派生）、口数随 data.total、整体尺寸随 data.scale ——
 *   体重越大、口数越多，画面里的奶滴与节拍越清楚。
 */
const MilkdrinkDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "foam", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 16 }, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.25 }, direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xFFFBF0, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        open: {
            duration: 24,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "first_gulp", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 16 } }, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.08], gravity: 0.015,
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xFFFBF0, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glow", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: { data: "scale", fallback: 0.1 },
                    color: 0xFFFBF0, alpha: [0.7, 0], light: "full", bloom: 0.15, maxParticles: 30
                }
            ]
        },
        gulp: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "drops", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 16 } }, shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.02, 0.07], gravity: 0.02,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xFFFBF0, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "swallow", bind: "source", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.3 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: { data: "scale", fallback: 0.09 },
                    color: 0xDCEBF0, alpha: [0.7, 0], light: "full", maxParticles: 26
                }
            ]
        },
        refresh: {
            duration: 28,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "wash", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: { data: "clean", fallback: 0.8 } }, direction: "outward", speed: [0.08, 0.22], drag: 0.9,
                    lifetime: [12, 22], size: [0.18, 0.02], sizeMode: "index",
                    color: 0xDCEBF0, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cleanse", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 22 }, shape: { kind: "ring", radius: { data: "clean", fallback: 0.8 } }, direction: "up", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xFFFBF0, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        wipe: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.02, 0.06], gravity: 0.01,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xE8D9A8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_milkdrink", 1, MilkdrinkDefinition);
