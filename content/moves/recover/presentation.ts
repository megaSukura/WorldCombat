/**
 * 自我再生 / Recover 的粒子语言。
 *
 * 一句话：伤口处一层青绿的再生光顺着身体往上爬，细密的微光贴着皮肤一圈圈升起来，把血一点点补回去。
 * 色相家族：青绿 0x7FD8A0 作主体，暖白 0xE9FFF0 作高光，深绿 0x2E6B45 只作收尾余尘。
 * 拍子：起（windup）／聚（begin）／生（regenerate，每次真实治疗推一次）／收（settle）／断（broken）。
 * 生命周期：regenerate 由本次 execute 的 WorldFeedback.actionScenes 承载；结束时 stop／finish 收势，
 *   被打断或转为新的出手时动作清理、broken 当刻停流——不会在驱散后继续播完同样的时长。
 * 范围：作用于自己，绑 source（fit body）——光晕半径绑定 data.glow，玩家看得出它是贴着这具身体在修，而不是一块地面区域；
 *   移动时光仍贴着身体跟随，不停。
 * 机制驱动：regenerate 的上升微光速率绑定 data.rate（每刻回复量派生）、明细亮度随 data.intensity（本次真实回量派生）、
 *   整体尺寸随 data.scale（光晕范围派生）、环脉冲半径随 data.glow、已交付进度随 data.fill —— 伤越重、回得越实，画面越密越亮。
 */
const RecoverDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "pool", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "motes", fallback: 22 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "glow", fallback: 0.9 } }, direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x7FD8A0, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        begin: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "bloom", bind: "source", offset: [0, 0.45, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "motes", fallback: 22 } },
                    shape: { kind: "sphere", radius: { data: "glow", fallback: 0.9 } }, direction: "up", speed: [0.03, 0.10],
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x9FE8B8, alpha: [0.8, 0], light: "full", bloom: 0.15, maxParticles: 70
                },
                {
                    name: "ground_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3 }, shape: { kind: "circle", radius: { data: "glow", fallback: 0.9 } },
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.24, 0.54],
                    color: 0xE9FFF0, alpha: [0.65, 0], light: "full", maxParticles: 14
                }
            ]
        },
        regenerate: {
            exit: { drain: 16 },
            emitters: [
                {
                    name: "motes", bind: "source", offset: [0, 0.15, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "rate", fallback: 26 }, shape: { kind: "sphere", radius: 0.42 }, direction: "up", speed: [0.01, 0.035],
                    lifetime: [14, 24], size: { data: "scale", fallback: 0.12 },
                    color: 0x9FE8B8, alpha: [0.75, 0], light: "full", bloom: 0.15, maxParticles: 70
                },
                {
                    name: "skin", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: { data: "glow", fallback: 0.9 } }, direction: "up", speed: [0.005, 0.02],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xE9FFF0, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "pulse", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 10, interval: 16, repeats: 8 },
                    shape: { kind: "ring", radius: { data: "glow", fallback: 0.9 } }, direction: "inward", speed: [0.01, 0.03],
                    lifetime: [12, 22], size: [0.2, 0.5],
                    color: 0x7FD8A0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.45 }, direction: "up", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xE9FFF0, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "fade", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x7FD8A0, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        broken: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "shatter", bind: "source", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0x2E6B45, alpha: [0.6, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_recover", 1, RecoverDefinition);
