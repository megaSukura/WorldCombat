/**
 * 光合作用 / Synthesis 的粒子语言。
 *
 * 一句话：叶片从脚边收拢、向上摊开，四片叶脉在整段光合里依次亮起，每次真的回了血才有一颗绿光收进身体；
 *   日照越足叶脉越密、越亮，被打断时叶片向内合拢。
 * 色相家族：叶绿 0x8FCF6E 作主体，日光金 0xFFE08A 作高光，暖白 0xFFF6D8 只作顶部光幕。
 * 拍子：起（windup）／持续（soak）／脉（vein，四次依次亮）／入体（mote，仅真实回复）／合（close，被打断）。
 * 范围：作用于自己，绑 source（fit body）；叶环贴脚边，光幕在头顶，玩家看得出这是一招自我回复。
 * 机制驱动：vein 的叶数绑定 data.motes（由当刻日照算出），单叶尺寸绑定 data.petalSize（随日照增大）；
 *   mote 的绿光尺寸绑定 data.moteSize（由这一口实际回复量算出）；整体尺寸随 data.scale 变化。
 */
const SynthesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "leaf_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 16, shape: { kind: "circle", radius: 0.9 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "full", maxParticles: 44
                },
                {
                    name: "sun_hint", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "light", fallback: 0 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        soak: {
            duration: 0,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "leaf_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "circle", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "full", maxParticles: 48
                },
                {
                    name: "canopy", bind: "source", offset: [0, 0.95, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 7, shape: { kind: "hemisphere", radius: 0.8 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.22, 0.06],
                    color: 0xFFF6D8, alpha: [{ data: "light", fallback: 0.2 }, 0], light: "full", maxParticles: 26
                }
            ]
        },
        vein: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vein0", bind: "source", offset: [0.42, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "point" },
                    start: { data: "s0", fallback: 30 }, stop: 30,
                    direction: "up", speed: [0.03, 0.10], spin: 6,
                    lifetime: [12, 22], size: [{ data: "petalSize", fallback: 0.09 }, 0.02],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "vein1", bind: "source", offset: [-0.42, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "point" },
                    start: { data: "s1", fallback: 30 }, stop: 30,
                    direction: "up", speed: [0.03, 0.10], spin: 6,
                    lifetime: [12, 22], size: [{ data: "petalSize", fallback: 0.09 }, 0.02],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "vein2", bind: "source", offset: [0, 0.12, 0.42], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "point" },
                    start: { data: "s2", fallback: 30 }, stop: 30,
                    direction: "up", speed: [0.03, 0.10], spin: 6,
                    lifetime: [12, 22], size: [{ data: "petalSize", fallback: 0.09 }, 0.02],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "vein3", bind: "source", offset: [0, 0.12, -0.42], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "point" },
                    start: { data: "s3", fallback: 30 }, stop: 30,
                    direction: "up", speed: [0.03, 0.10], spin: 6,
                    lifetime: [12, 22], size: [{ data: "petalSize", fallback: 0.09 }, 0.02],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "vein_glow", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE08A, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        mote: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "green_mote", bind: "source", offset: [0, 0.85, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "inward", speed: [0.08, 0.16],
                    lifetime: [12, 18], size: [{ data: "moteSize", fallback: 0.12 }, 0.03],
                    color: 0x8FCF6E, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 4
                },
                {
                    name: "mote_trail", bind: "source", offset: [0, 0.85, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.03, 0.10],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xFFF6D8, alpha: [0.8, 0], light: "full", maxParticles: 12
                }
            ]
        },
        close: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "leaf_close", bind: "source", offset: [0, 0.35, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_synthesis", 1, SynthesisDefinition);
