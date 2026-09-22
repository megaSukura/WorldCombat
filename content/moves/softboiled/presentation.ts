/**
 * 生蛋 / Soft-Boiled 的粒子语言。
 *
 * 一句话：一枚温热的蛋滚落脚边，蛋壳透出蜜色的光，一下一下地脉动；片刻后啄开，暖光顺着地缝爬上受益者把它补回去。
 * 色相家族：暖白 0xFFF6E6 作蛋与高光，蜜黄 0xF2D06B 作脉动暖光，壳粉 0xE8C4C8 只作蛋壳碎片。
 * 拍子：起（windup）／产（lay）／守（cradle，持续到孵化）／孵（hatch）／废（wasted）／碎（smashed）。
 * 范围：产蛋镜头绑 source（施法者）；守候镜头绑 source（此时 source 就是蛋本体），所以玩家能看到蛋在地上等；
 *   孵化镜头绑 point（受益者位置）——一眼看出回复是落在谁身上。
 * 机制驱动：lay 与 smashed 的碎片数绑定 data.shells（体重派生）、cradle 的脉动密度绑定 data.cradle（身高派生）、
 *   整体尺寸绑定 data.scale —— 蛋越大、碎片越多、等待时脉动越明显。
 */
const SoftboiledDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 14, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.4 }, direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xF2D06B, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        lay: {
            duration: 28,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "drop", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/softboiled_egg",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.25 }, direction: "outward", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: { data: "scale", fallback: 0.3 }, sizeMode: "index",
                    color: 0xFFF6E6, alpha: [0.95, 0], light: "full", maxParticles: 10
                },
                {
                    name: "shards", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shells", fallback: 14 } }, shape: { kind: "sphere_surface", radius: 0.4 }, direction: "outward", speed: [0.05, 0.16], gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8C4C8, alpha: [0.85, 0], light: "world", maxParticles: 50
                },
                {
                    name: "nest", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: { data: "scale", fallback: 1 } }, direction: "outward", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.24, 0.54],
                    color: 0xFFF6E6, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        cradle: {
            exit: { drain: 16 },
            emitters: [
                {
                    name: "pulse", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "cradle", fallback: 6 }, shape: { kind: "sphere", radius: 0.24 }, direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 20], size: { data: "scale", fallback: 0.12 },
                    color: 0xF2D06B, alpha: [0.6, 0], light: "full", bloom: 0.15, maxParticles: 24
                },
                {
                    name: "shell_glow", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 4, interval: 12, repeats: 8 }, shape: { kind: "sphere_surface", radius: 0.2 }, direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xFFF6E6, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        hatch: {
            duration: 32,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "shells", fallback: 14 } }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFF6E6, alpha: [0.9, 0], light: "full", bloom: 0.15, maxParticles: 60
                },
                {
                    name: "rise", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.45 }, direction: "up", speed: [0.04, 0.12],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xFFF6E6, alpha: [0.9, 0], light: "full", maxParticles: 44
                }
            ]
        },
        wasted: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "duds", bind: "source", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.01, 0.05], gravity: 0.01,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xE8C4C8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        smashed: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/eggbomb_eggshards",
                    burst: { count: { data: "shells", fallback: 14 } }, shape: { kind: "sphere", radius: 0.35 }, direction: "outward", speed: [0.08, 0.2], gravity: 0.03,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8C4C8, alpha: [0.9, 0], light: "world", maxParticles: 50
                },
                {
                    name: "smoke", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.35 }, direction: "outward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0xFFF6E6, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_softboiled", 1, SoftboiledDefinition);
