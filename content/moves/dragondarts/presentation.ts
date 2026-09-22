/**
 * 龙箭 / dragondarts 的客户端表现。
 *
 * 一句话：施法者身侧聚起两团龙气 → 两支拖着龙紫尾迹的箭先后飞出去、各自拐向要追的那只 →
 *   命中处炸开一团龙色冲击与龙气碎点。两支箭分不分头，从尾迹各自拐向谁就看得出来。
 * 色相家族：龙紫（0x7C6BE8）与冷蓝（0x5A8CE8）为主体，近白青（0xE8F0FF）只给箭尖与击点，烟色收尾。
 * 拍子：起 aim（聚气）→ 射 first/second（两箭）→ 击 strike（命中）/ graze（掠过没打中）→ 收 done。
 * 范围：first/second 沿各自投射物本部走，strike 绑在受击者身上；两箭的横向间隔由 `data.scale` 与出手间隔 `data.spread` 决定。
 * 运动：两支箭沿追踪轨迹飞向各自目标，命中向外爆龙气。
 * 数：`data.motes`（物攻派生）绑定命中龙气量，`data.index`（第几支）驱动第二支的收尾层；画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DragondartsMoveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        aim: {
            duration: 8,
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.4, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 2, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.5, 0.14, 0.14] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 11], size: [0.12, 0.02],
                    color: 0x7C6BE8, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 22
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.4, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 9], size: [0.07, 0.012],
                    color: 0xE8F0FF, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        first: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "dart", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    trail: { minDistance: 0.18 },
                    rate: 46, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0x7C6BE8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "wake", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 },
                    rate: 16, shape: { kind: "sphere", radius: 0.08 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [6, 12], size: [0.05, 0.012],
                    color: 0x5A8CE8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        second: {
            duration: 16,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "dart", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    trail: { minDistance: 0.16 },
                    rate: 54, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.0, 0.035],
                    lifetime: [5, 10], size: [0.17, 0.03],
                    color: 0x9A8CFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "launch", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xE8F0FF, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [4, 9], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xE8F0FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "motes", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.012],
                    color: 0x5A8CE8, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        graze: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "past", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x9A8CFF, alpha: [0.55, 0], light: "world", maxParticles: 22
                }
            ]
        },
        done: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "settle", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.15, 0.05],
                    color: 0x7C6BE8, alpha: [0.5, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragondarts", 1, DragondartsMoveDefinition);
