/**
 * 虫鸣 / bugbuzz —— 客户端表现。
 *
 * 一句话：施法者鼓动身体、在口边压出一圈振动 → 一次从身体发出的压缩环、同时整片锥形范围短促共振一下（瞬时声压，不跨多刻远传） →
 *   锥内每个被扫到的敌人身上炸开一圈土黄色的振波。
 * 色相家族：虫系的黄绿（0x9FB13A / 0xD8E36A）为主，近白（0xF2F7D0）只给击点；烟尘收在灰绿。
 * 拍子：起 windup（鼓振）→ 鸣 wave（身体压缩环 + 全范围短共振，单次）→ 击 hit（每人身上一震）。
 * 范围：wave 的短共振用与判定同一组 `data.angle`／`data.length` 画水平扇面，玩家一眼看出站在哪块扇形里会被震到。
 * 运动：压缩环从身体向外一圈；锥形共振在锥面内一次性铺开就收，不再一重重远传。
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
            duration: 20,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "burst_ring", bind: "source", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 2 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: [8, 14], size: [0.25, 0.75],
                    color: 0xA8C63A, alpha: [0.7, 0], light: "world", maxParticles: 8
                },
                {
                    name: "resonance", bind: "point", fit: "world", orient: "heading", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "rings", fallback: 4 } },
                    shape: { kind: "sector", radius: { data: "length", fallback: 9 }, angleDegrees: { data: "angle", fallback: 62 } },
                    direction: "outward", speed: [0.18, 0.5], spread: 14,
                    lifetime: [6, 13], size: [0.14, 0.03],
                    color: 0xC7D855, alpha: [0.55, 0], light: "world", maxParticles: 200
                },
                {
                    name: "resonance_motes", bind: "point", fit: "world", orient: "heading", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "rings", fallback: 4 } },
                    shape: { kind: "sector", radius: { data: "length", fallback: 9 }, angleDegrees: { data: "angle", fallback: 62 } },
                    direction: "outward", speed: [0.12, 0.4],
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
