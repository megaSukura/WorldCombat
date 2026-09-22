/**
 * 虫之抵抗 / strugglebug 的客户端表现。
 *
 * 一句话：施法者撑住身形、脚下聚起虫点 → 一圈贴地的虫群从脚下向外推出去、前缘一路爬过地面 →
 * 被扫到的敌人身上炸开一丛虫，虫群留在它们身上继续爬，把它们拖慢。
 * 色相家族：虫系的黄绿（0x9FB13A / 0xC7D855）为主，近白（0xF2F7D0）只给击点，尘收在灰绿。
 * 拍子：起 brace（拢住）→ 涌 burst（起点一圈）+ wave（前缘一圈圈推出去，半径每刻更新）→ 击 hit（每人身上一丛虫）→ 散 settle。
 * 范围：wave 的地圈半径直接绑服务端的 `data.radius`（真实扩散半径，随前缘逐刻变大），玩家看到的圈就是会被扫到的地。
 * 运动：虫群沿地圈由内向外爬，虫点在圈上向外扩散；击中的虫从目标身上向内收、再散开。
 * 数：`data.radius` 决定地圈大小，`data.motes`（特攻派生）决定虫群密度，`data.intensity`（本次威力派生）抬高击点亮暗。
 */
const StrugglebugDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hunker", bind: "source", offset: [0, 0.05, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "circle", radius: 0.6, thickness: 0.2 },
                    direction: "inward", speed: [0.02, 0.09], gravity: 0.02,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC7D855, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 16, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x9FB13A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "seed", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "motes", fallback: 24 }, at: 0 },
                    shape: { kind: "circle", radius: 0.6, thickness: 0.2 },
                    direction: "outward", speed: [0.1, 0.34], spread: 20, gravity: 0.02,
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0xA8C63A, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        wave: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 110,
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.76 },
                    direction: "outward", speed: [0.1, 0.3], spread: 10,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0xC7D855, alpha: [0.55, 0], light: "world", maxParticles: 200
                },
                {
                    name: "crawl", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: { data: "motes", fallback: 24 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.7 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24, gravity: 0.015,
                    lifetime: [8, 16], size: [0.08, 0.015],
                    color: 0x9FB13A, alpha: [0.75, 0], light: "world", maxParticles: 220
                },
                {
                    name: "ground", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 60,
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.8 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xEAF0B0, alpha: [0.5, 0], light: "world", maxParticles: 160
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF2F7D0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "cling", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x9FB13A, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], spread: 28,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xD8E36A, alpha: [0.8, 0], light: "full", maxParticles: 26
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40,
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 }, thickness: 0.6 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x8FA030, alpha: [0.3, 0], light: "world", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_strugglebug", 1, StrugglebugDefinition);
