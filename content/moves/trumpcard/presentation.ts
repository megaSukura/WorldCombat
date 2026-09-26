/**
 * 王牌 / trumpcard 的客户端表现。
 *
 * 一句话：起手时一张牌在身前亮起、牌面随余牌变少而越来越亮，并数出手中还剩几张（末牌时完整大印一次）；
 * 随后牌打着旋飞向对手或点，一路拖出金色碎光，在目标身上炸开一道决绝的白金光痕（末牌不附爆圈），撞墙则在方块格上碎开。
 * 色相家族：金与近白（mediumfadeorb、bigsparkle、glowingsparkle_yellow、impact_normal、slash、largering）为主，
 * 余韵收在中性浅金；没有第二个色相。
 * 拍子：起（draw 亮牌）→ 行（throw 脱手、flight 飞行）→ 击（strike 炸开）→ 收（fade 落空 / break 撞墙碎牌）。
 * 范围：strike 绑命中点，画出的就是牌炸开的位置；break 绑原生方块格与表面；flight 绑牌本体，玩家沿它的飞行轨迹读出这一掷能到多远。
 * 运动：牌直线飞出（必中式逐刻拐向对手），撞实是短促外爆与一道白痕，落空只剩一小撮散光。
 * 数：`data.trail`（本掷威力换算）绑定飞行拖尾的发射率，`data.sparks`（本掷威力换算）绑定炸开的碎光数量，
 * `data.remaining`（投后余牌）决定手中剩余小牌数的发射量，`data.last` 决定末牌那一次完整大印，
 * `data.spent`（余牌消耗）抬高牌面与整掷的亮度，`data.intensity` 再整体放大密度，`data.scale` 缩放命中环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TrumpcardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "card_glow", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xF0D060, alpha: [{ data: "spent", fallback: 0.5 }, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "card_specks", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparkles", fallback: 10 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 11], size: [0.08, 0.02],
                    color: 0xFBE9B0, alpha: [{ data: "spent", fallback: 0.5 }, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "hand_cards", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: { data: "remaining", fallback: 0 }, at: 0 },
                    shape: { kind: "line", length: 0.5, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xF0D060, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "last_seal", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "last", fallback: 0 }, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.34, 0.7],
                    color: 0xFFF2C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 4
                }
            ]
        },
        throw: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "release", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.28], spread: 12,
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xFBE9B0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "release_ring", bind: "source", offset: [0, 0.7, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.26, 0.6],
                    color: 0xF0D060, alpha: [0.55, 0], light: "full"
                }
            ]
        },
        flight: {
            duration: 40,
            exit: { stop: 34, drain: 8 },
            emitters: [
                {
                    name: "card_body", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "trail", fallback: 30 }, shape: { kind: "sphere", radius: 0.12 },
                    direction: "shape", speed: [0.01, 0.05], spin: 120,
                    lifetime: [4, 9], size: [0.2, 0.1],
                    color: 0xFBE9B0, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "card_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "trail", fallback: 30 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.2 },
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xF0D060, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "card_lines", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: [10, 18], shape: { kind: "box", size: [0.2, 0.2, 0.2] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [3, 6], size: [0.1, 0.02],
                    color: 0xFBE9B0, alpha: [0.35, 0], light: "full", maxParticles: 60
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "slam", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFBE9B0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "cut", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "box", size: [0.3, 0.4, 0.3] },
                    direction: "outward", speed: [0.1, 0.3], spin: 180,
                    lifetime: [5, 10], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xF0D060, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "slam_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "ring", fallback: 1 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.34, 0.8],
                    color: 0xF0D060, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "seal", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "last", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.5, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 6
                }
            ]
        },
        break: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.1, 0.03], sizeMode: "index",
                    color: 0xF0D060, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "shard_dust", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0xC9A66B, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fade: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "miss", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xF0D060, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trumpcard", 1, TrumpcardDefinition);
