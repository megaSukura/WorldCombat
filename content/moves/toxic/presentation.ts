/**
 * 剧毒 / toxic 的客户端表现。
 *
 * 一句话：一团紫绿毒液被吐向目标，扎进去后毒在体内越钻越深，每隔几秒冒一次更浓的泡，最后整具身体炸出一次爆发。
 * 色相家族：低饱和的沼泽绿做主体，饱和的紫绿只出现在细节层与爆发核心（毒的身份色）。
 * 拍子：起（windup 0–8t，喉间聚毒）→ 击（travel 飞行 / root 入体）→ 收（escalate 一轮轮加深，burst 总爆发，wither 枯萎）。
 * 范围：travel 沿投射物画轨迹；root/escalate/burst 都绑目标身体——画出的就是毒真正落在谁身上。
 * 运动：毒液沿抛出的直线走；入体后泡从体内向上冒；爆发时向四周炸开。
 * 数：服务端按机制算出 `count`（这一轮冒多少颗泡）、`size`（泡多大）、`speed`（冒多急）交给下面的发射器；
 * 加深级数越高，这三个值越大，玩家看得见毒在变凶。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ToxicDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xA8C24A, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "haze", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 22], size: [0.16, 0.24],
                    color: 0x6E8A3A, alpha: [0.22, 0], light: "world", maxParticles: 16
                }
            ]
        },
        travel: {
            duration: 60,
            exit: { stop: 60, drain: 12 },
            emitters: [
                {
                    name: "glob", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalball",
                    rate: 26, trail: { minDistance: 0.18 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "shape", speed: [0, 0.02],
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x9BE04A, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "drip", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 18, trail: { minDistance: 0.3 },
                    direction: "down", speed: [0.0, 0.03], gravity: 0.03, drag: 0.95,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x7FA83C, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        root: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "latch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 18 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "inward", speed: [0.06, 0.18],
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0x8FBF3C, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "clinging_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.26, 0.1],
                    color: 0x6E8A3A, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        escalate: {
            duration: 24,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "deepening", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: { data: "speed", fallback: 0.14 },
                    lifetime: [12, 22], size: { data: "size", fallback: 0.1 },
                    color: 0x8FBF3C, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "deep_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: { data: "speed", fallback: 0.1 },
                    lifetime: [10, 18], size: { data: "size", fallback: 0.2 },
                    color: 0x5E7A2E, alpha: [0.55, 0], light: "world", maxParticles: 48
                }
            ]
        },
        burst: {
            duration: 34,
            exit: { stop: 18, drain: 22 },
            emitters: [
                {
                    name: "burst_core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: { data: "speed", fallback: 0.24 },
                    lifetime: [8, 15], size: { data: "size", fallback: 0.36 }, sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "burst_goo", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "count", fallback: 40 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: { data: "speed", fallback: 0.3 },
                    lifetime: [12, 22], size: { data: "size", fallback: 0.12 }, sizeMode: "index",
                    color: 0xB8E04A, alpha: [0.9, 0], gravity: 0.04, drag: 0.92, light: "full", maxParticles: 140
                },
                {
                    name: "burst_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: { data: "speed", fallback: 0.16 },
                    lifetime: [18, 30], size: [0.3, 0.1],
                    color: 0x546B2A, alpha: [0.35, 0], light: "world", maxParticles: 80
                }
            ]
        },
        wither: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.16, 0.26],
                    color: 0x4E5C34, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        immune: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "repel", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xC9D8A0, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 16], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x7FA83C, alpha: [0.7, 0], gravity: 0.05, light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_toxic", 1, ToxicDefinition);
