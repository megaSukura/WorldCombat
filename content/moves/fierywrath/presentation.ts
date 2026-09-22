/**
 * 怒火中烧 / fierywrath 的客户端表现。
 *
 * 一句话：施法者周身先把暗红火焰收进体内，随即一圈酒红与炭橙的气场从身上向外炸开，贴地一圈火光扫过，
 * 余怒式下同一圈还会一段段地再亮起、慢慢熄灭；被震懵的人头上晃星。
 * 色相家族：酒红（0x6A2B4F）与炭橙（0xC05A3A）为主，近白（0xF6D9C0）只在爆发的核心出现；
 * 与爆炸烈焰的正橙火是两家。
 * 拍子：起（seethe 收焰）→ 击（burst 炸开、hit 逐个命中）→ 收（afterglow / linger 余怒、fade 熄灭）。
 * 范围：burst 与 linger 的地面圈按 `data.radius`（气场半径）铺满，画到哪就打到哪；气场以自身为中心。
 * 运动：主体由内向外炸开并贴地扩散，余韵烟向上浮，余怒一段段向外脉动。
 * 数：`data.marks`（命中人数派生）决定爆发碎焰量，`data.intensity`（本次实际伤害 / 70）决定命中亮度，
 * 因此近处吃满的人比边缘的人炸得更亮。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FierywrathDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        seethe: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 24, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.1], spin: 6,
                    lifetime: [8, 16], size: [0.18, 0.04],
                    color: 0x9B4A6A, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "rise", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xC05A3A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [12, 20], size: [0.5, 1.3],
                    color: 0x6A2B4F, alpha: [0.7, 0], light: "world"
                },
                {
                    name: "flame", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.1, 0.42], spread: 18,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0xC05A3A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.45], spread: 20,
                    lifetime: [7, 13], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xF6D9C0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.14, 0.5], spread: 30,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xE08A4A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 220
                },
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [16, 28], size: [0.3, 0.5],
                    color: 0x4A2338, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.3], spread: 16,
                    lifetime: [6, 12], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xF6D9C0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xC05A3A, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        afterglow: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "aura", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 40, shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "inward", speed: [0.02, 0.1],
                    gravity: -0.006, drag: 0.94,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x9B4A6A, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 140
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 24, shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xC05A3A, alpha: [0.45, 0], light: "world", maxParticles: 100
                }
            ]
        },
        linger: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "pulse", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xB4655A, alpha: [0.5, 0], light: "world"
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "marks", fallback: 6 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.04, 0.18], spread: 12,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xE08A4A, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        flinch: {
            duration: 24,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xF6D9C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "die", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20 },
                    shape: { kind: "hemisphere", radius: { data: "radius", fallback: 3.0 } },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [16, 28], size: [0.28, 0.5],
                    color: 0x4A2338, alpha: [0.26, 0], light: "world", maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.0 } },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0x9B4A6A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fierywrath", 1, FierywrathDefinition);
