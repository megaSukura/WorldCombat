/**
 * 棉孢子 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身周当场鼓开一团棉絮，成群的白色孢子扑向四周，黏在附近每个人身上，慢慢把他们裹住。
 *
 * 色相家族：棉白（0xF6F3EA）与暖米（0xE4D6C4）为主体，浅粉棕（0xE9C9B8）只做细节小点。没有第二个色相。
 * 层次：鼓絮（起手）→ 孢子群（炸开的主体）→ 棉花团（细节）→ 裹身棉环（某人被黏）→ 棉绒余韵（持续）。
 * 起击收：windup（鼓起）→ burst（炸开）→ clung（黏到人身上）→ linger（棉絮还在飘）。
 * 数：炸开的孢子量按服务端 data.spores 派生；某人身上的裹身棉量按 data.drop 派生，画面与机制一致；
 *   炸开的范围半径读 data.scale 缩放，画的正是机制覆盖的那一圈。
 */
const CottonSporeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "cotton_swell", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.04], spin: 20,
                    color: 0xF6F3EA, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 34,
            emitters: [
                {
                    name: "burst_spores", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "spores", fallback: 30 }, interval: 2, repeats: 4 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 40, drag: 0.93, gravity: 0.002,
                    lifetime: [16, 30], size: [0.22, 0.06], spin: 24,
                    color: 0xF6F3EA, alpha: [0.85, 0], light: "world", maxParticles: 140
                },
                {
                    name: "burst_puff", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.12], drag: 0.9,
                    lifetime: [20, 34], size: [0.34, 0.7],
                    color: 0xE4D6C4, alpha: [0.3, 0], light: "world", maxParticles: 40
                },
                {
                    name: "burst_motes", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } }, direction: "up",
                    speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xE9C9B8, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        clung: {
            duration: 26,
            emitters: [
                {
                    name: "clung_wrap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "tufts", fallback: 12 }, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: [0.16, 0.05], spin: 18,
                    color: 0xF6F3EA, alpha: [0.6, 0], light: "world", maxParticles: 50
                },
                {
                    name: "clung_motes", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "drop", fallback: 2 }, interval: 4, repeats: 4 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xE9C9B8, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_fluff", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 3, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.03], spin: 14,
                    color: 0xF6F3EA, alpha: [0.3, 0], light: "world", maxParticles: 14
                },
                {
                    name: "linger_motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xE4D6C4, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cottonspore", 1, CottonSporeDefinition);
