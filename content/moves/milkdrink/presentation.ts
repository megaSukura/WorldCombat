/**
 * 喝牛奶 / Milk Drink 的粒子语言。
 *
 * 一句话：它仰头连饮，嘴边浮起少量乳白奶滴、每口咽下一枚小小的凉环，最后一口清亮的水光把毒冲散。
 * 色相家族：乳白 0xFFFBF0 作奶与高光，浅奶蓝 0xDCEBF0 作泡沫与冲毒水光，淡金 0xE8D9A8 只作余韵。
 * 拍子：起（windup）／开饮（open）／每口（gulp，每喝一口推一次）／净（refresh，真正喝完最后一口且解毒时）／抹（wipe）。
 *   gulp 逐口出现、由每次 execute 逐口 emit，不依赖等间隔整段闪烁；真正补进生命时 data.intensity 更足，满血解毒时补 0 也照喝。
 * 范围：作用于自己，绑 source（fit body）；冲毒一幕的水光半径绑定 data.clean（身高派生），一眼看出解毒波及的范围。
 * 机制驱动：每口溅起的奶滴数绑定 data.drops（体重派生）、口数随 data.total、每口强弱随 data.intensity（本次真实回量派生）；
 *   粒子尺寸按中等体型写成小值，由引擎按 data.scale 统一放大一次——体重越大、回得越实，奶滴与节拍越清楚，但不会叠成亮团。
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
                    name: "raise", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.08], gravity: 0.015,
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xFFFBF0, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "glow", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.06, 0.02],
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
                    burst: { count: { data: "drops", fallback: 10 } }, shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.02, 0.07], gravity: 0.02,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFFBF0, alpha: [0.8, 0], light: "world", maxParticles: 32
                },
                {
                    name: "swallow", bind: "source", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 6 }, shape: { kind: "ring", radius: 0.28 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xDCEBF0, alpha: [0.7, 0], light: "full", maxParticles: 18
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
