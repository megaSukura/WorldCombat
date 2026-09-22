/**
 * 虫鸣 / bugbuzz —— 客户端表现。
 *
 * 一句话：施法者鼓动身体、在口边压出一串振动 → 一道锥形声波朝目标方向贴地推出去、越远越淡 → 锥内每个被扫到的
 * 敌人身上炸开一圈土黄色的振波。
 * 色相家族：虫系的黄绿（0x9FB13A / 0xD8E36A）为主，近白（0xF2F7D0）只给击点；烟尘收在灰绿。
 * 拍子：起 windup（鼓振）→ 鸣 wave（锥形扩散）→ 击 hit（每人身上一震）。
 * 范围：wave 用与判定同一组 `data.angle`／`data.length` 画锥体，玩家一眼看出站在哪块扇形里会被震到。
 * 运动：声环沿锥体轴向 `data.direction` 冲出，贴地扩散。
 * 数：每人的 hit 与 wave 的密度绑定 `data.rings`（特攻与等级换算），强度绑定 `data.intensity`（近端威力 / 84）。
 */
const BugBuzzDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "charge_body", bind: "source", offset: [0, 0.3, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 14], size: [0.09, 0.02],
                    color: 0xD8E36A, alpha: [0.9, 0], light: "full", maxParticles: 34
                },
                {
                    name: "charge_rings", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, repeats: 3, interval: 4 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [6, 12], size: [0.2, 0.4],
                    color: 0x9FB13A, alpha: [0.6, 0], light: "world", maxParticles: 12
                }
            ]
        },
        wave: {
            duration: 26,
            exit: { stop: 18, drain: 14 },
            emitters: [
                {
                    name: "wave_volume", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 90,
                    burst: { count: { data: "rings", fallback: 4 }, repeats: 3, interval: 3 },
                    shape: { kind: "cone_volume", radius: 0.3, length: { data: "length", fallback: 9 }, angleDegrees: { data: "angle", fallback: 62 } },
                    direction: "outward", speed: [0.2, 0.55], spread: 14,
                    lifetime: [6, 14], size: [0.14, 0.03],
                    color: 0xC7D855, alpha: [0.55, 0], light: "world", maxParticles: 200
                },
                {
                    name: "wave_rings", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, repeats: { data: "rings", fallback: 4 }, interval: 3 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [10, 18], size: [0.25, 0.75],
                    color: 0xA8C63A, alpha: [0.7, 0], light: "world", maxParticles: 12
                },
                {
                    name: "wave_motes", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "rings", fallback: 4 },
                    burst: { count: { data: "rings", fallback: 4 }, repeats: 2, interval: 4 },
                    shape: { kind: "cone_volume", radius: 0.3, length: { data: "length", fallback: 9 }, angleDegrees: { data: "angle", fallback: 62 } },
                    direction: "outward", speed: [0.15, 0.45],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xF2F7D0, alpha: [0.6, 0], light: "full", maxParticles: 150
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.28, 0.05], sizeMode: "index",
                    color: 0xF2F7D0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "hit_ring", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.22, 0.5],
                    color: 0xA8C63A, alpha: [0.75, 0], light: "world", maxParticles: 6
                },
                {
                    name: "hit_motes", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "rings", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], spread: 30,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xD8E36A, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bugbuzz", 1, BugBuzzDefinition);
