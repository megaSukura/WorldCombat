/**
 * 鬼火 / willowisp 的客户端表现。
 *
 * 一句话：施法者身前一盏冷色鬼火亮起，脱手后自己扭着追向目标，追上时在目标身上缠成一圈冷焰并慢慢烧下去。
 * 色相家族：月白与冰蓝为主（wisp / glowingsmoke_cyan / smallfadeorb），饱和的青白只出现在火心与追迹上。
 * 拍子：起（windup 0–10t，火苗点亮）→ 击（travel 追迹 / burn 缠身 / immune 熄灭 / block 撞墙）→ 收（burn 余韵慢烧，fizzle 散尽）。
 * 范围：travel 沿投射物画轨迹，burn 整套绑目标身体——画出的就是火真正追到谁；block 画在方块表面，与实体命中分开。
 * 运动：鬼火沿追迹掠过并留下一条青色尾；命中后冷焰从目标身上向外卷起一圈。
 * 数：服务端把 `flow`（每秒撒多少追迹）与 burn 的 `count`/`size`/`speed`（灼伤越长，火越旺）交给发射器；
 * 灼伤时长直接决定命中火的大小。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const WillowispDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "kindle", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "flow", fallback: 10 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xBFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 26
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xE8FAFF, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        travel: {
            duration: 0,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "wisp_core", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "flow", fallback: 30 }, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.08 },
                    direction: "shape", speed: [0, 0.02],
                    lifetime: [8, 14], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xBFE8FF, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cold_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: { data: "flow", fallback: 22 }, trail: { minDistance: 0.24 },
                    direction: "shape", speed: [0, 0.03], drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x7FD7F0, alpha: [0.5, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burn: {
            duration: 36,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "burn_flash", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "count", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: { data: "speed", fallback: 0.2 },
                    lifetime: [8, 14], size: { data: "size", fallback: 0.32 }, sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "cling_flame", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: { data: "speed", fallback: 0.16 },
                    lifetime: [14, 26], size: { data: "size", fallback: 0.16 },
                    color: 0x9FE0F0, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "burn_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: { data: "speed", fallback: 0.12 },
                    lifetime: [12, 20], size: { data: "size", fallback: 0.24 },
                    color: 0x5FB6D8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        block: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "sputter", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xBFE8FF, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "frost_ash", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.14, 0.22],
                    color: 0x6E7C88, alpha: [0.25, 0], light: "world", maxParticles: 20
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
                    color: 0xE0F0FF, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "snuff", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 30
                },
                {
                    name: "last_spark", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_willowisp", 1, WillowispDefinition);
