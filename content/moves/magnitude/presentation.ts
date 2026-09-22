/**
 * 震级 / magnitude 的客户端表现。
 *
 * 一句话：施法者沉身压地，地面在身周接连横颤过几道——尘从缝里跳起、碎石往上蹦；
 * 震级越大地颤得越猛、尘跳得越高，震级够大时被打断的人身上炸开一道短促的白光。
 * 色相家族：土黄与灰岩为主体（earth / large_rock / tinydust / ring/groundquake），
 * 灰白只给打断那一下的高光。与地震共用土色，但地震是整块掀起、这里是原地密颤。
 * 拍子：起 brace 沉身 ／ 震 shake 连颤几道 + hit 逐处 ／ 断 stagger ／ 收 settle 或空震 miss。
 * 范围：shake / settle 的地面圈按 `data.radius`（真实震幅）画出，圈就是会颤到的地。
 * 运动：尘与碎石从整片地里向上蹦起再落回，横颤环贴着地面在原地一次次扩散开。
 * 数：`data.crests`（物攻派生）决定横颤道数，`data.dust`（物攻与体重派生）决定尘与碎石的量，
 *   `data.magnitude`（当场掷出的震级）驱动强度与亮度，`data.scale`（震幅/3.8）放大尺度。
 */
const MagnitudeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, interval: 4, repeats: 2, at: 2 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x9A8A72, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "edge", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 18, shape: { kind: "ring", radius: { data: "radius", fallback: 3.8 } },
                    direction: "up", speed: [0.01, 0.04], spread: 8,
                    lifetime: [10, 16], size: [0.34, 0.5], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        shake: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "ripple", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "dust", fallback: 20 }, interval: 3, repeats: { data: "crests", fallback: 3 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.8 } },
                    direction: "outward", speed: [0.01, 0.05], spread: 6,
                    lifetime: [8, 14], size: [0.45, 0.85], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.65, 0], light: "world", maxParticles: 160
                },
                {
                    name: "clods", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 20 }, interval: 3, repeats: { data: "crests", fallback: 3 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.8 } },
                    direction: "up", speed: [0.08, 0.3], spread: 20,
                    gravity: 0.06, drag: 0.93,
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 200
                },
                {
                    name: "slabs", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "crests", fallback: 3 }, interval: 5, repeats: 2, at: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.8 }, thickness: 0.7 },
                    direction: "up", speed: [0.12, 0.4], spread: 26,
                    gravity: 0.08, drag: 0.95,
                    lifetime: [14, 26], size: [0.2, 0.04],
                    color: 0x9A8A72, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "haze", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 20 }, shape: { kind: "circle", radius: { data: "radius", fallback: 3.8 } },
                    direction: "up", speed: [0.01, 0.06], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.4, 0], light: "world", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 15 },
            emitters: [
                {
                    name: "kick", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.36], spread: 28,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [12, 22], size: [0.11, 0.02],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "puff", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.2], spread: 18,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9A8A72, alpha: [0.6, 0], light: "world", maxParticles: 50
                }
            ]
        },
        stagger: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "crests", fallback: 3 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.1, 0.32], spread: 18,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 24
                },
                {
                    name: "shards", bind: "target", offset: [0, 0.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "crests", fallback: 3 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.12, 0.4], spread: 26,
                    gravity: 0.08, drag: 0.95,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0x9A8A72, alpha: [0.75, 0], light: "world", maxParticles: 30
                }
            ]
        },
        settle: {
            duration: 22,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "settle_dust", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 3.8 } },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 28], size: [0.04, 0.01],
                    color: 0x6E5A44, alpha: [0.25, 0], light: "world", maxParticles: 100
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magnitude", 1, MagnitudeDefinition);
