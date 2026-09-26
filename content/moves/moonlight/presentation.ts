/**
 * 月光 / Moonlight 的粒子语言。
 *
 * 一句话：头顶凝起一轮冷月，月色像一层窄纱垂下裹住身体；真正回了血才落银绿回血点，真正清掉灼伤时火星熄成冷光。
 * 色相家族：月银蓝 0xBBD8F5 作主体，冷白 0xEAF2FF 作高光，靛蓝 0x6C7CB8 只作余韵。
 * 拍子：起（windup）／落纱（veil，仅真实回复）／薄（hush，没回进生命时的单薄月色）／凉雾（soothe，仅灼伤被清掉时）。
 * 范围：作用于自己，绑 source（fit body）：月轮在头顶、纱幕包住身体，玩家看得出这是自我回复。
 * 机制驱动：veil 的落光数绑定 data.drops（夜里晴空 18、白天 6），身体光点绑定 data.bursts（月色＋回复量算出），
 *   整体尺寸随 data.scale（夜里 1.4、白天 0.85）缩放——白天放这招画面明显单薄。
 */
const MoonlightDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "moon_hint", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/balls/moonball/moonballsparkle",
                    rate: { data: "windupRate", fallback: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xBBD8F5, alpha: [0.6, 0], light: "full", maxParticles: 26
                },
                {
                    name: "cool_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0x6C7CB8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        veil: {
            duration: 34,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "moon_disc", bind: "source", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 2 }, shape: { kind: "point" },
                    direction: "down", speed: [0, 0.02],
                    lifetime: [16, 26], size: [0.46, 0.72],
                    color: 0xEAF2FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "fall_veil", bind: "source", offset: [0, 1.0, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/balls/moonball/moonballsparkle",
                    burst: { count: { data: "drops", fallback: 14 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xBBD8F5, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "veil_screen", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 6, shape: { kind: "cylinder", radius: 0.6, length: 1.5 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [20, 34], size: [0.2, 0.05],
                    color: 0xBBD8F5, alpha: [0.12, 0.02], light: "full", maxParticles: 26
                },
                {
                    name: "veil_burst", bind: "source", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "bursts", fallback: 18 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xEAF2FF, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "ground_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 5 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.66],
                    color: 0xBBD8F5, alpha: [0.55, 0], light: "full", maxParticles: 12
                }
            ]
        },
        hush: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "thin_shroud", bind: "source", offset: [0, 0.6, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 4, shape: { kind: "cylinder", radius: 0.45, length: 1.2 },
                    direction: "up", speed: [0.002, 0.01],
                    lifetime: [18, 30], size: [0.16, 0.03],
                    color: 0xBBD8F5, alpha: [{ data: "moon", fallback: 0 }, 0], light: "world", maxParticles: 14
                }
            ]
        },
        soothe: {
            duration: 28,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "cool_mist", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: [0.16, 0.03],
                    color: 0x6C7CB8, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "chill_shard", bind: "source", offset: [0, 0.3, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xBBD8F5, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_moonlight", 1, MoonlightDefinition);
