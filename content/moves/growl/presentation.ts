/**
 * 叫声 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者仰头叫一声，一圈暖黄的音符与声环从身上荡开，扫过所有听得见的人；被叫到的人头顶持续飘着错拍的小音符。
 *
 * 色相家族：暖黄（0xE8A33A／0xE8B84A）为主体，近白黄（0xFFF2C8）只做音符高光，浅黄尘（0xE8D8A0）收地面。
 * 层次：鼓气（起手，身侧聚音符）→ 声环＋地面音符＋扬尘（叫声荡开）→ 音符盖头（落到人身上）→ 头顶余韵（持续）→ 淡尘（没人听见）。
 * 起击收：windup（鼓气）→ call（荡开）→ hush（落到人身上）→ linger（分神还在，慢慢离场）。
 * 范围：call 的地面环按 3.5 格参考半径书写，由服务端 data.scale = 叫声半径 / 3.5 缩放到真实半径，环铺到哪就是会被叫到哪；
 *   声音不看视线，所以环是完整的圆。
 * 运动：声环沿地面向外扩，音符从圆心向四面升、再落到每个人身上。
 * 数：声环与音符的数量读 data.notes（特攻派生），命中人数读 data.hits 缩放整体密度。
 */
const GrowlDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "inhale", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 12, shape: { kind: "ring", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFF2C8, alpha: [0.6, 0], light: "full", maxParticles: 28
                }
            ]
        },
        call: {
            duration: 32,
            exit: { stop: 18, drain: 18 },
            emitters: [
                {
                    name: "call_ring", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "notes", fallback: 20 } },
                    shape: { kind: "ring", radius: 3.5 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.6],
                    color: 0xE8A33A, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "call_notes", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 20 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 3.5 },
                    direction: "up", speed: [0.03, 0.1], spread: 12, spin: 8,
                    lifetime: [16, 26], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFF2C8, alpha: [0.75, 0], light: "full", maxParticles: 90
                },
                {
                    name: "call_dust", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "notes", fallback: 20 },
                    shape: { kind: "ring", radius: 3.5 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xE8D8A0, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        hush: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hush_notes", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "notes", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 24,
                    gravity: 0.008, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xFFF2C8, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "hush_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.26, 0.12],
                    color: 0xE8A33A, alpha: [0.45, 0], light: "full", maxParticles: 30
                }
            ]
        },
        linger: {
            exit: { drain: 28 },
            emitters: [
                {
                    name: "linger_notes", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 3, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03], spin: 6,
                    lifetime: [16, 26], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xFFF2C8, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_orbs", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xE8D8A0, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xE8D8A0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_growl", 1, GrowlDefinition);
