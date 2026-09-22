/**
 * 力量戏法 / powertrick 的客户端表现。
 *
 * 一句话：身侧浮起两张牌——一张暖橙（攻势）、一张冷蓝（守势），先分开成形 → 一手假动作让两张牌在半空对穿、换位，
 *   中间炸出一圈亮光 → 翻定之后两张牌保持着换了位的样子极慢地绕身转，直到你再演一次把它们翻回。
 * 色相家族：双色——攻势暖橙 0xFF9A3C 与守势冷蓝 0x4AC8E8，对穿的一瞬用近白 0xFFF2E0 落强调层，
 *   超能紫 0x8A5CF0 只作戏法的运力，不抢两色的辨识。
 * 拍子：起（gather 0–14t）→ 翻（trick 0–26t，对穿）→ 存（hold 持续）→ 收（lapse／flipback 0–28t）。
 * 范围：本招作用在自己身上；gather/trick/hold 绑 `source` 随体型缩放，翻定的环形随 `data.scale`（攻防差距派生）。
 * 运动：两牌从身侧分开升起 → 对穿到彼此的位置、撞出一圈亮光 → hold 交换位后极慢自转 → 收势时两牌归位或碎开。
 * 数：牌数与对穿粒子数绑 `data.spin`（特攻派生），对穿强度绑 `data.intensity`（攻防差距派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const PowerTrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_warm", bind: "source", fit: "body", offset: [-0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "spin", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFF9A3C, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_cool", bind: "source", fit: "body", offset: [0.45, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "spin", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x4AC8E8, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        trick: {
            duration: 26,
            exit: { stop: 10, drain: 15 },
            emitters: [
                {
                    name: "trick_warm", bind: "source", fit: "body", offset: [-0.5, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "spin", fallback: 6 }, at: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFF9A3C, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "trick_cool", bind: "source", fit: "body", offset: [0.5, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "spin", fallback: 6 }, at: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: [0.25, 0.55],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x4AC8E8, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "trick_flash", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [10, 18], size: [0.5, 0.15],
                    color: 0xFFF2E0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 10
                },
                {
                    name: "trick_spark", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "spin", fallback: 6 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8A5CF0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        hold: {
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "hold_card", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: { data: "spin", fallback: 3 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.004, 0.014], spin: 14,
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFF9A3C, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 30
                },
                {
                    name: "hold_card_cool", bind: "source", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 26], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0x4AC8E8, alpha: [0.24, 0], alphaMode: "sin", light: "world", maxParticles: 20
                }
            ]
        },
        lapse: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "lapse_return", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.24, 0.05],
                    color: 0xFFF2E0, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        flipback: {
            duration: 28,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "flip_flash", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.11, 0.02],
                    color: 0xFFF2E0, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "flip_smoke", bind: "source", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.3],
                    color: 0x8A8172, alpha: [0.25, 0], light: "world", render: "translucent", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powertrick", 1, PowerTrickDefinition);
