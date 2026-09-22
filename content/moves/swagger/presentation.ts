/**
 * 虚张声势 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者胸前聚起一团红怒，砸到目标身上炸开，目标头顶从此绕着一只眩晕的鸟，
 * 每次被怒火反噬都在它身上闷响一下。
 *
 * 色相家族：怒火红（0xC0392B／0xE2531B）为主体与强调，深红近黑做烟，近白只做高光小点；
 * 冷嘲被共享策略拒绝时改播灰白「不为所动」。
 * 层次：红怒（起手，源侧）／冲击＋怒纹＋内收环（命中，目标侧）／飞鸟与脚下余烬（持续）／反噬闷响（随机分支）。
 * 起击收：windup（聚怒）→ taunt（炸开并留下怒火）→ dazed（持续飞鸟）→ fumble（反噬）。
 * 数：taunt 的爆发量与内收环半径分别绑定服务端算出的 burst 与 scale；fumble 的冲击量绑定实际反噬比例算出的 power。
 */
const SwaggerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "toward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.26, 0.08], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.85, 0], light: "full", maxParticles: 24
                },
                {
                    name: "gather_smoke", bind: "source", height: 0.3, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.24, 0.06],
                    color: 0x2A0A0A, alpha: [0.25, 0], light: "world", maxParticles: 40
                }
            ]
        },
        taunt: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "anger_burst", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "burst", fallback: 30 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.26],
                    lifetime: [7, 13], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.95, 0], light: "full", bloom: 0.3
                },
                {
                    name: "anger_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [12, 18], size: [0.34, 0.16],
                    color: 0xC0392B, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "anger_marks", bind: "target", offset: [0, 1.15, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 4, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.26, 0.1], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.8, 0], light: "full", maxParticles: 16
                },
                {
                    name: "anger_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0x3A0A0A, alpha: [0.55, 0], gravity: 0.02, drag: 0.95, light: "world", maxParticles: 40
                }
            ]
        },
        dazed: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "bird", bind: "target", offset: [0, 0.3, 0], height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 6, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 30], size: [0.24, 0.12], sizeMode: "sin",
                    color: 0xE2531B, alpha: [0.55, 0], light: "full", maxParticles: 14
                },
                {
                    name: "feet_ember", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 34], size: [0.14, 0.05], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 18
                }
            ]
        },
        fumble: {
            duration: 24,
            exit: { stop: 8, drain: 22 },
            emitters: [
                {
                    name: "recoil_hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "power", fallback: 16 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.05, 0.22],
                    lifetime: [6, 12], size: [0.28, 0.03], sizeMode: "index",
                    color: 0x8E1B1B, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "recoil_dust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x3A0A0A, alpha: [0.6, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 34
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

WorldCombatParticles.scene("world_combat:move_swagger", 1, SwaggerDefinition);
