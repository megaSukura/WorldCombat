/**
 * 双针 / twineedle 的客户端表现。
 *
 * 一句话：施法者端起两根针，一前一后射出去；第一根先扎进对方身上、第二根随后追上同一处，针口炸开一小簇
 *   虫色碎屑与毒泡。交叉式下两根明显从身体两侧分头飞。
 * 色相家族：虫黄绿（0xB6D84A）做针与碎屑，毒绿（0x9BE86B）只出现在针口毒泡上；近白做针尖亮点。
 *   整体是「两根」的节奏，与一根细针（毒针）一眼分开。
 * 拍子：起 aim（端针）→ 一 first（第一根）→ 二 second（第二根）→ 扎 sting（针口）→ 收 done。
 * 范围：first/second 沿各自投射物本部走，sting 绑在受击者身上；两针的横向间隔由 `data.flank` 决定。
 * 运动：两根针沿同一条线（交叉式下从两侧）飞向同一目标，第二根在第一根之后到达，命中点重合。
 * 数：`data.motes`（由物攻派生）绑定命中碎屑量，`data.flank`（由碰撞箱宽度派生）绑定两针间隔，
 *   `data.index`（第几针）驱动第二针的收尾层。画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const TwineedleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        aim: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 0.35, 0.28], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 2, interval: 3, repeats: 2 },
                    shape: { kind: "box", size: [0.3, 0.1, 0.1] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.13, 0.02],
                    color: 0xB6D84A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 18
                },
                {
                    name: "venomtip", bind: "source", offset: [0, 0.35, 0.28], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 7, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 9], size: [0.06, 0.012],
                    color: 0x9BE86B, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        first: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "shaft", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.2 },
                    rate: 44, shape: { kind: "sphere", radius: 0.07 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [4, 8], size: [0.15, 0.02],
                    color: 0xB6D84A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 44
                },
                {
                    name: "prickle", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.32 },
                    rate: 14, shape: { kind: "sphere", radius: 0.06 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.05, drag: 0.92,
                    lifetime: [6, 11], size: [0.05, 0.012],
                    color: 0x8FA83A, alpha: [0.5, 0], light: "world", maxParticles: 28
                }
            ]
        },
        second: {
            duration: 18,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "shaft", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.18 },
                    rate: 52, shape: { kind: "sphere", radius: 0.07 },
                    direction: "outward", speed: [0.0, 0.035],
                    lifetime: [4, 8], size: [0.16, 0.02],
                    color: 0xCBE86B, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 52
                },
                {
                    name: "launch", bind: "source", fit: "none", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.06, 0.012],
                    color: 0x9BE86B, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        sting: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "wound", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [4, 9], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xE6F5B0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 22
                },
                {
                    name: "chips", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.15], gravity: 0.07, drag: 0.9,
                    lifetime: [7, 14], size: [0.05, 0.012],
                    color: 0x8FA83A, alpha: [0.65, 0], light: "world", maxParticles: 44
                },
                {
                    name: "venom", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "motes", fallback: 8 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.014],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", maxParticles: 40
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
                    lifetime: [7, 13], size: [0.16, 0.05],
                    color: 0xB6D84A, alpha: [0.5, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_twineedle", 1, TwineedleDefinition);
