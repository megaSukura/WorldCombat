/**
 * 吹捧 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者欠身说出一串暖金色的奉承，音符与爱心在目标头顶炸开，目标脚步一顿被钉在原地冒金星。
 *
 * 色相家族：暖金（0xE8B84B）与粉（0xE58AA8）为主体与强调，近白只做高光；被共享策略拒绝时改播灰白。
 * 层次：音符（起手，源侧）／音符＋爱心＋fairy 冲击（命中）／脚下落定环（定身）／飞鸟与音符（持续）／反噬闷响。
 * 起击收：windup（欠身开口）→ praise（炸开奉承）→ pin（钉住）→ dazed（陶醉）→ fumble（反噬）。
 * 数：praise 的爆发量与内收环半径绑定服务端算出的 burst 与 scale；定身环的粒子数绑定 pin 刻数。
 */
const FlatterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "hum_notes", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 10, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xE8B84B, alpha: [0.75, 0], light: "full", maxParticles: 26
                },
                {
                    name: "hum_spark", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xF3D98A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        praise: {
            duration: 32,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "note_burst", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.22], spin: 10,
                    lifetime: [10, 18], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xE8B84B, alpha: [0.9, 0], light: "full"
                },
                {
                    name: "hearts", bind: "target", offset: [0, 1.15, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 6, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 24], size: [0.24, 0.1], sizeMode: "sin",
                    color: 0xE58AA8, alpha: [0.85, 0], light: "full", maxParticles: 20
                },
                {
                    name: "praise_glint", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 16, at: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.26, 0.03], sizeMode: "index",
                    color: 0xF3D98A, alpha: [0.9, 0], light: "full", bloom: 0.25
                },
                {
                    name: "praise_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 42 }, shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [12, 18], size: [0.32, 0.15],
                    color: 0xE8B84B, alpha: [0.5, 0], light: "full", maxParticles: 70
                }
            ]
        },
        pin: {
            duration: 24,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "pin_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "pin", fallback: 12 } }, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.08],
                    lifetime: [12, 20], size: [0.34, 0.5],
                    color: 0xE8B84B, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "pin_dust", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF3D98A, alpha: [0.45, 0], light: "full", maxParticles: 30
                }
            ]
        },
        dazed: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "bird", bind: "target", offset: [0, 0.3, 0], height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 5, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 30], size: [0.22, 0.11], sizeMode: "sin",
                    color: 0xE8B84B, alpha: [0.5, 0], light: "full", maxParticles: 12
                },
                {
                    name: "soft_note", bind: "target", offset: [0, 0.25, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 30], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xE58AA8, alpha: [0.35, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        },
        fumble: {
            duration: 24,
            exit: { stop: 8, drain: 22 },
            emitters: [
                {
                    name: "recoil_hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "power", fallback: 16 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [6, 12], size: [0.26, 0.03], sizeMode: "index",
                    color: 0xC98A3A, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "recoil_dust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x8A6A2A, alpha: [0.55, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 34
                }
            ]
        },
        resist: {
            duration: 20,
            exit: { stop: 6, drain: 18 },
            emitters: [
                {
                    name: "resist_smoke", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.2, 0.3],
                    color: 0x9AA0A6, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flatter", 1, FlatterDefinition);
