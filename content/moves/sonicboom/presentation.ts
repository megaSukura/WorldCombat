/**
 * 音爆 / sonicboom 的客户端表现。
 *
 * 一句话：空气被瞬间撕开——口前先是一圈白环，随后一条笔直的裂纹当刻连到对手身上，裂痕边缘迸出细碎的白点；
 * 回响式再补一条略偏青的裂纹。
 * 色相家族：近白（0xEAF6FF）为主，回响补一层浅青（0xA9E6FF），强调用原型 impact_normal；身份来自 Sonic Boom 贴图。
 * 拍子：起（charge 白环内收）→ 击（crack 即时裂纹、impact 命中）→ 回（reverb 第二声）。
 * 范围：crack／reverb 用 `data.path`（施法者口前 → 裂痕终点）画 polyline，裂纹连到哪就是打到哪；线两侧宽度读 `data.scale`（裂痕宽度 / 0.34）。
 * 运动：白环向外炸开后立刻收束成一点，裂纹由口前向终点铺开；没有可见弹体，只有被拉开的空气。
 * 数：`data.sparks`（特攻与等级换算的碎点数）绑定裂纹发射率与命中爆发数量，`data.echo`（第几声）切换色相与亮度，
 * `data.intensity`（sparks / 20）抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SonicboomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "ring_in", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 22, shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [3, 7], size: [0.07, 0.02],
                    color: 0xA9E6FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        crack: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/vanilla/flash",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [3, 6], size: [0.6, 0.1],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 4
                },
                {
                    name: "line", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 16 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [4, 9], size: [0.28, 0.06], sizeMode: "sin",
                    color: 0xEAF6FF, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 220
                },
                {
                    name: "shards", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/white",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "sparks", fallback: 16 } },
                    direction: "shape", speed: [0.08, 0.34], spread: 26,
                    lifetime: [3, 7], size: [0.1, 0.02],
                    color: 0xD6F0FF, alpha: [0.85, 0], light: "full", maxParticles: 160
                }
            ]
        },
        reverb: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 16 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [4, 9], size: [0.26, 0.05], sizeMode: "sin",
                    color: 0xA9E6FF, alpha: [0.75, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "shards", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "sparks", fallback: 16 } },
                    direction: "shape", speed: [0.06, 0.26], spread: 22,
                    lifetime: [4, 10], size: [0.09, 0.02],
                    color: 0xA9E6FF, alpha: [0.85, 0], light: "full", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF2FBFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "sparks", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [6, 13], size: [0.12, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sonicboom", 1, SonicboomDefinition);
