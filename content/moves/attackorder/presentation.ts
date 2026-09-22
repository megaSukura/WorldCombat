/**
 * 攻击指令 / attackorder 的客户端表现。
 *
 * 一句话：施法者振翅、身后炸开一群琥珀色小虫 → 手下按间隔一只只起飞、拖着细尘扑向目标 → 每只落到身上刺出
 *   一记虫击火花 → 打掉的手下当场散去，够不到的手下慢慢飘没。
 * 色相家族：蜜蜡琥珀（0xF2C14E 主体、0xB07A2E 暗部）＋暖白（0xFFF3C4）只出现在振翅与刺中，与回复指令同一族——同一个虫群。
 * 拍子：起 call（振翅放虫）→ 扑 gather（待命）／ fly（飞行）→ 刺 sting（命中）→ 散 slain／ spent。
 * 范围：sting 的虫击火花绑在目标身上；手下自身的位置由它们各自的 `gather`／`fly` 场景标出，玩家能数出还剩几只。
 * 运动：飞行的手下拖一条细尘尾迹朝目标走；刺中后火花向外上迸开。
 * 数：call 的爆发数绑定 `data.burst`（手下面数 × 8），sting 的火花量绑定 `data.count`（每只威力换算），
 *   手下场景的粒子大小绑定 `data.size`（档位换算）。
 */
const AttackOrderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        call: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "swarmburst", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/populationbomb_maus",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.9, spin: 8,
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0xF2C14E, alpha: [0.95, 0], light: "full", maxParticles: 110
                },
                {
                    name: "callring", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3 }, shape: { kind: "circle", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 24], size: [0.34, 0.8],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", maxParticles: 16
                },
                {
                    name: "callmote", bind: "source", offset: [0, 0.45, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 20, repeats: 2, interval: 5 }, shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        gather: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "hover", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 5, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.005, 0.02], spin: 6,
                    lifetime: [12, 20], size: { data: "size", fallback: 0.14 },
                    color: 0xF2C14E, alpha: [0.9, 0.15], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 10
                }
            ]
        },
        fly: {
            exit: { drain: 12 },
            emitters: [
                {
                    name: "body", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/populationbomb_maus",
                    rate: 8, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.04], spin: 8,
                    lifetime: [10, 18], size: { data: "size", fallback: 0.16 },
                    color: 0xF2C14E, alpha: [0.9, 0.1], alphaMode: "sin", light: "full", bloom: 0.25, maxParticles: 14
                },
                {
                    name: "trail", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.005, 0.02], trail: { minDistance: 0.2 },
                    lifetime: [8, 15], size: [0.05, 0.01],
                    color: 0xB07A2E, alpha: [0.55, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sting: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "bite", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.32], spread: 26,
                    lifetime: [7, 13], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "motes", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.14], gravity: 0.04, drag: 0.92,
                    lifetime: [9, 16], size: [0.06, 0.01],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        slain: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fall", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xB07A2E, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        spent: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xB07A2E, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_attackorder", 1, AttackOrderDefinition);
