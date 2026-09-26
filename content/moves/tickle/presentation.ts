/**
 * 挠痒 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者指尖跳起一串暖黄的碎点并朝目标探手，准备末尾先把两三道短弯痕亮在真实的接触方向上；
 *   真正贴上时接触点并排划出那几道弯痕，目标才抖出一层笑点；被墙挡下只留碎石，彻底落空则是一记划空。
 *
 * 色相家族：暖黄（0xF2C94C／0xF7DF8A）为主体，近白黄（0xFFF6D9）只做贴上那一刻的小亮点。
 * 层次：指尖碎点与探手（起手）→ 短弯痕（准备末尾的接触预告）→ 接触处并排弯痕＋笑爆（命中）→
 *   墙面碎石（撞墙）→ 划空风（落空）→ 笑意余韵（持续）→ 淡尘。
 * 起击收：reach（探手＋短弯痕）→ claw（每道真实接触的弯痕）与 fit（目标笑爆）→ scrape／whiff → linger。
 * 范围：reach 与 claw 都读服务端给出的 data.direction 与实际接触点路径，画的就是判定用到的那一侧。
 * 数：接触弯痕的道数读 data.marks（攻击下降级数派生），笑爆碎点数读 data.sparks（速度派生）。
 */
const TickleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "tickle_fingers", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xF7DF8A, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "tickle_reach", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "marks", fallback: 2 } },
                    shape: { kind: "line", length: 0.55 }, orient: "direction", direction: "shape",
                    speed: [0.04, 0.12], spread: 8,
                    lifetime: [6, 11], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xF2C94C, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        claw: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "tickle_claw", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    shape: { kind: "polyline" }, burst: { count: 3 },
                    direction: "shape", orient: "direction", speed: [0.05, 0.16], spread: 10,
                    lifetime: [5, 9], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6D9, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 18
                },
                {
                    name: "tickle_claw_dust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" }, burst: { count: 3 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.03,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xF7DF8A, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fit: {
            duration: 28,
            emitters: [
                {
                    name: "tickle_burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "sparks", fallback: 20 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], spread: 40, spin: 12,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF2C94C, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "tickle_spark", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 25,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFF6D9, alpha: [0.95, 0], light: "full", maxParticles: 80
                }
            ]
        },
        scrape: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "tickle_chips", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "marks", fallback: 2 } }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.04, 0.14], spread: 22,
                    lifetime: [5, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xE8DCC0, alpha: [0.85, 0], light: "world", maxParticles: 16
                },
                {
                    name: "tickle_grit", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xF7DF8A, alpha: [0.5, 0], gravity: 0.05, light: "world", maxParticles: 20
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "tickle_air", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: { data: "marks", fallback: 2 }, interval: 2, repeats: 2 },
                    shape: { kind: "line", length: 0.6 }, orient: "direction", direction: "shape",
                    speed: [0.08, 0.2], spread: 10,
                    lifetime: [5, 10], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xF7DF8A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "tickle_linger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 4, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF7DF8A, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "tickle_fizzle", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xF2C94C, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tickle", 1, TickleDefinition);
