/**
 * 晨光 / Morning Sun 的粒子语言。
 *
 * 一句话：抬头一迎，一轮暖日在头顶升起、绽出光芒，暖光落回身上；白天晴空是从天顶照到身上的亮束，
 *   夜里或阴雨只剩贴身的零散暗光；真的接住晨光后，脚边沿身体朝向留下一段短光步。
 * 色相家族：日出橙 0xFFB25A 作主体，日光金 0xFFE08A 作高光，暖白 0xFFF6E0 只落在光核。
 * 拍子：起（windup）／日（dawn 强光回复）／微（glimmer 弱光回复）／敛（hush，没回进生命时的弱光）／振（vigor，仅提速真的生效）。
 * 范围：作用于自己，绑 source（fit body）。
 * 朝向：vigor 的脚边光步用 orient:"heading" 读 data.direction，落在身体左右两侧，随本次朝向而不是固定世界 X 两侧。
 * 机制驱动：dawn 的爆发数绑定 data.bursts、光芒条数绑定 data.rays、亮束密度绑定 data.beamRate、整体尺寸随 data.scale；
 *   弱光走 glimmer，没有亮束、条数与尺寸都小，夜里放这招画面明显暗弱。
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
                    name: "sky_beam", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "beamRate", fallback: 22 },
                    shape: { kind: "cylinder", radius: 0.28, length: 3.4, thickness: 0.35 },
                    direction: "down", speed: [0.04, 0.14],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFE08A, alpha: [0.5, 0], light: "full", bloom: 0.15, maxParticles: 60
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
        glimmer: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dim_drift", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "rays", fallback: 6 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.015],
                    color: 0xFFB25A, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dim_floor", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xFFB25A, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        hush: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "thin_beam", bind: "source", offset: [0, 0.95, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "line", length: 0.5 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFB25A, alpha: [{ data: "dawn", fallback: 0 }, 0], light: "world", maxParticles: 18
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
                },
                {
                    name: "light_step", bind: "source", offset: [0, 0.06, 0], height: 0, orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 8, interval: 4, repeats: 2 },
                    shape: { kind: "box", size: [0.6, 0.04, 0.04] },
                    direction: "up", speed: [0.02, 0.07], spread: 20,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xFFE08A, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_morningsun", 1, MorningsunDefinition);
