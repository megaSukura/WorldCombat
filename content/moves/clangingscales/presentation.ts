/**
 * 鳞片噪音 / clangingscales 的客户端表现。
 *
 * 一句话：施法者绷紧身体、鳞片竖成一口钟、边缘泛起紫色共鸣光 → 一圈声波从身体炸开、贴着地面向外推去 →
 *   被震中的目标身上炸开龙色共鸣裂痕与碎鳞 → 响完鳞片松开、身上浮起松脱的灰紫鳞屑；回响式再荡一圈更淡的声波。
 * 色相家族：龙紫（impact_dragon / warblingring / glowingsparkle）为主体，纯白声波（sonicboom / ripple）作高频细节，
 *   灰紫鳞屑（spike / tinydust）作余韵。
 * 拍子：起 windup（绷紧、嗡鸣）→ 响 burst（声波炸开）→ 中 hit（共鸣裂痕）→ 回响 echo（第二圈）→ 收 loose（松鳞）。
 * 范围：burst 绑自身、fit none，地面环半径按 `data.scale`（实际半径 / 4.6）铺开，画出的就是被震到的那一圈；
 *   声波环向外推的终点与机制半径一致。
 * 运动：主震是贴地向外扩张的声环加向上崩起的裂痕；回响是第二圈更淡的声环；松鳞的碎屑向下落。
 * 数：`data.flow`（半径派生）决定声环密度、`data.rings`（威力派生）决定圈数、`data.marks`（威力派生）决定命中裂痕量，
 *   `data.intensity`（威力 / 110）放大整幕。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ClangingScalesDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "bristle", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.16, 0.04], spin: 10,
                    color: 0x9B7BE8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 36
                },
                {
                    name: "hum", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 10, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.5, 0.1],
                    color: 0xE0D8FF, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "flow", fallback: 60 }, at: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.2, 0.5],
                    lifetime: [8, 14], size: [0.7, 0.12], sizeMode: "index",
                    color: 0xE6E0FF, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "wave", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "rings", fallback: 8 }, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.16, 0.4],
                    lifetime: [10, 16], size: [0.9, 0.14], sizeMode: "index",
                    color: 0x9B7BE8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "hiss", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: { data: "rings", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 1.1 },
                    direction: "outward", speed: [0.1, 0.34],
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8E4FF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "resonate", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "marks", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "shards", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.07, drag: 0.92,
                    lifetime: [9, 16], size: [0.13, 0.02], spin: 12,
                    color: 0x9B7BE8, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        echo: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "again", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "flow", fallback: 40 }, at: 1 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.18, 0.42],
                    lifetime: [10, 16], size: [0.6, 0.1], sizeMode: "index",
                    color: 0xCDB6FF, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        loose: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "slack", bind: "source", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "shed", fallback: 14 } },
                    shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.05, drag: 0.92,
                    lifetime: [12, 20], size: [0.12, 0.02], spin: 8,
                    color: 0x9A8FB8, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "quiet", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xB0A8C8, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_clangingscales", 1, ClangingScalesDefinition);
