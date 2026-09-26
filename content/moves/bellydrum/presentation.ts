/**
 * 腹鼓 / Belly Drum 的粒子语言。
 *
 * 一句话：肚皮上一记记鼓点砸下去，地面跟着震；付血的一刻一记重鼓，鼓出的等级化作贴身的几道橙色鼓纹，
 *   窗口里余纹随剩余时间一圈圈变淡，到期只撤自己的那份。
 * 色相家族：鼓皮棕 0x8A5A44 作地面与余韵，力量橙 0xFF6A2A 作主体，炽白 0xFFE0A0 只落在小的强调粒子。
 * 拍子：起（windup 鼓点）／击（surge 一记重鼓与贴身纹路）／续（hold 窗口余纹）／收（fade 力量退去）。
 * 数目：windup 的鼓点次数绑定 data.beats；surge 的纹路数与爆发数绑定 data.beats/data.burst；
 *   hold 的密度绑定 data.glow（服务端按实际贡献与剩余时间算好），强度按 data.paidRatio 缩放。
 */
const BellyDrumDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "beat_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 4, repeats: { data: "beats", fallback: 6 } },
                    shape: { kind: "circle", radius: 0.7 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.4, 0.8],
                    color: 0x8A5A44, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "beat_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, interval: 4, repeats: { data: "beats", fallback: 6 } },
                    shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.07], gravity: 0.03,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xB08868, alpha: [0.6, 0], light: "world", maxParticles: 80
                },
                {
                    name: "beat_smoke", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 4, interval: 4, repeats: { data: "beats", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x8A5A44, alpha: [0.35, 0], light: "world", maxParticles: 40
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
