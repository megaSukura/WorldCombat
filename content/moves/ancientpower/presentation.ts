/**
 * 原始之力 / ancientpower —— 客户端表现。
 *
 * 一句话：施法者脚下裂出一圈将被撑开的古纹 → 琥珀色古能贴着地面炸开、上顶成半球，古石碎片被抛起、
 * 外缘一圈震波扫开、地面浮起一圈地缘符文 → 被轰到的敌人身上炸开古光 → 散开的余波反涌回自身时炸出一簇亮星。
 * 色相家族：琥珀与古金（earth / large_rock / groundquake / impact_rock 为主体，0xC8A24A、0xE8D08A 高光），
 * 中性岩灰（0x8A7A62）只给扬尘与地面。
 * 拍子：起 charge（裂纹浮动）→ 击 erupt（炸开）→ hit（逐个轰开）→ 涌 surge（反哺）／收 fade（余尘）。
 * 范围：charge 与 erupt 的地面圈、符文环都按服务端传的 `data.radius`（真实冲击半径）画出，玩家看到的圈就是会被轰到的地，
 *   `data.band` 把半球的高度画出来，离地的东西也在圈里。
 * 运动：碎片从地面斜向崩起再落下，震波环贴地向外扫，符文从圈内向上渗起。
 * 数：`data.shards`（特攻与等级换算）决定崩起的碎片量，`data.runes`（等级换算）决定浮起的符纹量。
 */
const AncientPowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "charge_runes", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    lifetime: [8, 16], size: [0.08, 0.16],
                    color: 0xC8A24A, alpha: [0.5, 0], light: "world", maxParticles: 36
                },
                {
                    name: "charge_dust", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "inward", speed: [0.02, 0.08], spread: 12,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.45, 0], light: "world", maxParticles: 32
                }
            ]
        },
        erupt: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "erupt_wave", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: 46, shape: { kind: "ring", radius: { data: "radius", fallback: 3.4 } },
                    direction: "outward", speed: [0.03, 0.12], spread: 8,
                    lifetime: [10, 18], size: [0.4, 0.85],
                    color: 0xC8A24A, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "erupt_shards", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "shards", fallback: 18 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 }, thickness: 0.85 },
                    direction: "up", speed: [0.28, 0.8], spread: 26,
                    gravity: 0.08, drag: 0.94,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0xA87B3A, alpha: [0.95, 0], light: "world", maxParticles: 150
                },
                {
                    name: "erupt_runes", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "runes", fallback: 8 }, at: 1 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.05, 0.22], spread: 16,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0xE8D08A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "erupt_core", bind: "point", offset: [0, 0.14, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: 9, size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8D08A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.28], spread: 18,
                    lifetime: 8, size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE8D08A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "hit_sparks", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "shards", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.4], spread: 26,
                    gravity: 0.04, drag: 0.93,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xC8A24A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "surge_column", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 30, shape: { kind: "cylinder", radius: 0.7, length: 1.8 },
                    direction: "up", speed: [0.05, 0.2], spread: 14,
                    lifetime: [12, 22], size: [0.14, 0.02],
                    color: 0xE8D08A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 26, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.1], spread: 8,
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xC8A24A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "fade_dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3.4 } },
                    direction: "up", speed: [0.01, 0.05], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ancientpower", 1, AncientPowerDefinition);
