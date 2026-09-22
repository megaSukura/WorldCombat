/**
 * 回收利用 / recycle 的客户端表现。
 *
 * 一句话：施法者俯身，四周的碎片与记忆里的那件道具以弧线朝掌心聚拢，收拢环合拢的一刻，那件道具沿一条归巢
 * 弧线飞回手里，掌心落一圈金光。
 * 色相家族：回收金（sparkle / orb）为主，暖褐（smoke）作余韵；金色只在「锻成」的一小片面积上最亮。
 * 拍子：收（gather 内聚碎屑与收拢环）→ 成（forge 道具飞回与掌心爆发）／空（fizzle 空转尘）。
 * 范围：gather 的地面环半径就是本次 `drawRadius`（服务端按 `data.scale = 半径/参考半径` 传入），玩家一眼知道
 *   取材范围有多大；forge 绑施法者，画出的就是道具归巢的位置。
 * 运动：碎屑由外向掌心内聚，道具贴图沿一条归巢弧线飞回；内聚用 inward、落定用 outward 短促外爆。
 * 数：`data.motes`（等级派生的回收火花数）驱动内聚与爆发粒子量，`data.found`（是否就地取材成功）在找到材料时
 *   额外点亮一圈材料光；两只精灵放同一招画面也不同。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const RecycleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "ring", bind: "source", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: { data: "motes", fallback: 10 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3 }, arcDegrees: 360 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.16, 0.02],
                    color: 0xE8C56A, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "scrap", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 10 },
                    shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xB99B5E, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "memory", bind: "source", offset: [0, 0.6, 0.2], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 5, interval: 5, repeats: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xFFE9A8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        forge: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "homebound", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 10 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0xF0D27A, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "flash", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 10 }, at: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 6 },
                    shape: { kind: "ring", radius: 0.45, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0xFFF2C9, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 6
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 7 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x8A7856, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_recycle", 1, RecycleDefinition);
