/**
 * 毒针 / poisonsting 的客户端表现。
 *
 * 一句话：施法者举起一根挂着毒滴的细针甩出去，针拖一条很细的毒绿灯尾飞出；扎进目标身上只留一根针，
 *   过一拍针口才渗出毒泡。甩空时那点毒液在落点散掉。
 * 色相家族：毒绿（0x9BE86B）与浅黄绿（0xC8F0A0）为主，近白只做针尖亮点——比毒击更细、更快、量更小。
 * 拍子：起 aim（举针）→ 飞 fly（细尾）→ 扎 stick（留针）→ 渗 embed（托管载体上持续的小针）→ seep（毒泡）→ 空 whiff。
 * 范围：fly 沿投射物本体走，stick 在真实接触点、embed/seep 绑在受击者身上，画面本身就是「这一针扎到哪」。
 * 运动：一根细针沿直线（对空直飞、有目标才有限追踪）飞出去，真的扎出伤害后针口才留在身上慢慢冒泡，毒到 `seep`
 *   才扩开；托管载体被提前清掉时 embed 一起消失、也不结算毒。一眼看出是「中针 → 中毒」两拍。
 * 数：`data.needles`（由物攻派生）绑定针尾毒滴与渗毒泡的数量，`data.scale`（由判定半径派生）缩放整体尺寸，
 *   `data.intensity`（由威力派生）抬高亮度。画面里的数量和机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PoisonstingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        aim: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 0.3, 0.28], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "needles", fallback: 8 }, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [4, 9], size: [0.07, 0.015],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", maxParticles: 28
                },
                {
                    name: "tipglint", bind: "source", offset: [0, 0.3, 0.28], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 6, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [3, 7], size: [0.05, 0.01],
                    color: 0xD7F5A8, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 16
                }
            ]
        },
        fly: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "shaft", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    trail: { minDistance: 0.2 },
                    rate: 46, shape: { kind: "sphere", radius: 0.07 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [4, 8], size: [0.13, 0.02],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 46
                },
                {
                    name: "drip", bind: "projectile", fit: "none", height: 0.0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    trail: { minDistance: 0.3 },
                    rate: 16, shape: { kind: "sphere", radius: 0.06 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.05, drag: 0.92,
                    lifetime: [6, 12], size: [0.06, 0.015],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 34
                }
            ]
        },
        stick: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "embed", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.16, 0.02],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "prick", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.14], spread: 18,
                    lifetime: [4, 8], size: [0.2, 0.03], sizeMode: "index",
                    color: 0xD7F5A8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 14
                }
            ]
        },
        embed: {
            duration: 0,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "needle", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "full", maxParticles: 4
                },
                {
                    name: "well", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 3, shape: { kind: "sphere", radius: 0.1 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.06, 0.012],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        seep: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "ooze", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "needles", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.015],
                    color: 0x9BE86B, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "spread", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.06],
                    color: 0xC8F0A0, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "splat", bind: "point", fit: "none", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.07, drag: 0.9,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9BE86B, alpha: [0.55, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poisonsting", 1, PoisonstingDefinition);
