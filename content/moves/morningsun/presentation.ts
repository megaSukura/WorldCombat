/**
 * 晨光 / Morning Sun 的粒子语言。
 *
 * 一句话：抬头一迎，一轮暖日在头顶升起、绽出光芒，暖光落回身上；接住晨光时脚边再留下一圈轻快的余韵。
 * 色相家族：日出橙 0xFFB25A 作主体，日光金 0xFFE08A 作高光，暖白 0xFFF6E0 只落在光核。
 * 拍子：起（windup）／日（dawn）／振（vigor，仅接住晨光时）。
 * 范围：作用于自己，绑 source（fit body）：日轮在头顶、光落回身体，玩家看得出是自我强化。
 * 机制驱动：dawn 的爆发数绑定 data.bursts（白天晴空＋回复量算出）、光芒条数绑定 data.rays（晴空 16、夜里 6），
 *   整体尺寸随 data.scale（晴空 1.5、夜里 0.85）放大或收缩——夜里放这招画面明显暗弱。
 */
const MorningsunDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dawn_hint", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "windupRate", fallback: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xFFE08A, alpha: [0.7, 0], light: "full", maxParticles: 26
                },
                {
                    name: "ground_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xFFB25A, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        dawn: {
            duration: 34,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "sun_disc", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0, 0.02],
                    lifetime: [16, 26], size: [0.5, 0.8],
                    color: 0xFFF6E0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "sun_rays", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "rays", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFE08A, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 48
                },
                {
                    name: "sun_fall", bind: "source", offset: [0, 0.9, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 22, shape: { kind: "circle", radius: 0.5 },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xFFE08A, alpha: [0.95, 0], light: "full", maxParticles: 54
                },
                {
                    name: "sun_burst", bind: "source", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "bursts", fallback: 18 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFF6E0, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        vigor: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "vigor_mote", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 14, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: [0.14, 0.02],
                    color: 0xFFB25A, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "vigor_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 5 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.32, 0.72],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_morningsun", 1, MorningsunDefinition);
