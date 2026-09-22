/**
 * 光合作用 / Synthesis 的粒子语言。
 *
 * 一句话：叶片从脚边收拢、向上摊开，光从头顶洒下来，绿金的叶与光点从地面升起收进身体——日照越足，
 *   收拢越密、绽放越大。
 * 色相家族：叶绿 0x8FCF6E 作主体，日光金 0xFFE08A 作高光，暖白 0xFFF6D8 只作顶部光幕。
 * 拍子：起（windup）／放（bloom）。
 * 范围：作用于自己，绑 source（fit body），叶环贴脚边，光幕在头顶，玩家看得出这是一招自我回复。
 * 机制驱动：bloom 的叶数与光点数绑定 data.bursts（由日照与本次回复比例算出），单叶起始尺寸绑定
 *   data.petalSize（随日照增大），整体尺寸随 data.scale（1 + 日照）放大。
 */
const SynthesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
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
                    rate: 10, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "petal_bloom", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "bursts", fallback: 18 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18], drag: 0.9, spin: 8,
                    lifetime: [14, 26], size: [{ data: "petalSize", fallback: 0.14 }, 0.03],
                    color: 0x8FCF6E, alpha: [0.9, 0], light: "full", maxParticles: 96
                },
                {
                    name: "leaf_lift", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 22, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.11],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0x8FCF6E, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "sun_glow", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "bursts", fallback: 16 } }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.10],
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0xFFE08A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "canopy", bind: "source", offset: [0, 0.95, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 9, shape: { kind: "hemisphere", radius: 0.8 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.22, 0.06],
                    color: 0xFFF6D8, alpha: [0.2, 0], light: "full", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_synthesis", 1, SynthesisDefinition);
