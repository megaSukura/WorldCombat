/**
 * 腹鼓 / Belly Drum 的粒子语言。
 *
 * 一句话：准备期一记记腹前敲击把鼓点砸在肚皮正面，末拍之后一记重鼓付血；鼓出的等级化作贴身的几道橙色鼓纹，
 *   窗口里余纹随剩余时间一圈圈变淡，到期只撤自己的那份。
 * 色相家族：鼓皮棕 0x8A5A44 作敲击与余韵，力量橙 0xFF6A2A 作主体，炽白 0xFFE0A0 只落在小的强调粒子。
 * 拍子：敲（tap 逐拍腹前短闪，服务端按真实准备时钟分别发出）／击（surge 一记重鼓与贴身纹路）／
 *   续（hold 窗口余纹）／收（fade 力量退去）。
 * 数目：tap 由服务端按准备时长分 3–5 次发出，每记带真实朝向与体型 scale，短闪而非全场圈；
 *   surge 的纹路数与爆发数绑定 data.beats/data.burst；hold 的密度绑定 data.glow，强度按 data.paidRatio 缩放。
 */
const BellyDrumDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tap: {
            sound: { id: "minecraft:block.note_block.bass", volume: 0.6, pitch: 0.8 },
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "tap_press", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.18 },
                    direction: "inward", speed: [0.03, 0.08], drag: 0.84,
                    lifetime: [5, 9], size: [0.16, 0.04],
                    color: 0x8A5A44, alpha: [0.6, 0], light: "world", maxParticles: 20
                },
                {
                    name: "tap_dust", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 6 }, shape: { kind: "line", length: 0.16 },
                    direction: "shape", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [5, 10], size: [0.05, 0.01],
                    color: 0xFFE0A0, alpha: [0.55, 0], light: "world", maxParticles: 12
                }
            ]
        },
        surge: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "beat_impact", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "beats", fallback: 6 }, interval: 2 }, shape: { kind: "ring", radius: 0.75 },
                    direction: "outward", speed: [0.08, 0.2], drag: 0.86,
                    lifetime: [10, 18], size: [0.4, 0.95],
                    color: 0xFF6A2A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "beat_dust", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "burst", fallback: 60 } }, shape: { kind: "circle", radius: 0.55 },
                    direction: "up", speed: [0.05, 0.16], gravity: 0.04,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFFE0A0, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "beat_smoke", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "beats", fallback: 6 }, interval: 2, repeats: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.09],
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x8A5A44, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 16 },
            emitters: [
                {
                    name: "hold_ripple", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { data: "glow", fallback: 4 }, shape: { kind: "circle", radius: 0.62 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [20, 34], size: [0.22, 0.06],
                    color: 0xFF6A2A, alpha: [0.22, 0.02], alphaMode: "sin", light: "world", maxParticles: 36
                },
                {
                    name: "hold_mote", bind: "target", offset: [0, 0.22, 0], height: 0.15, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "glow", fallback: 4 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0xFFE0A0, alpha: [0.5, 0], light: "full", maxParticles: 26
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_mote", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.02, 0.07],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xB08868, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fade_ember", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFF6A2A, alpha: [0.7, 0], light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bellydrum", 1, BellyDrumDefinition);
