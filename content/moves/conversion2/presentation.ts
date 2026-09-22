/**
 * 纹理２ / conversion2 的客户端表现。
 *
 * 一句话：一道冷色的读解视线搭上目标、把它上一手的属性收拢回来，再以那一种属性的色相在施法者身上翻织一层新纹理。
 * 色相家族：钢青与月白的中性层（read）＋ settle 里唯一的饱和色——被读出的属性色（data.color）。
 * 拍子：读（read 0–16t 收拢）→ 织（settle 0–44t，击 0–16t，收 16–44t）／空（fizzle 0–22t）。
 * 范围：read 的收拢环绑在目标身上，画出的就是被读的那一个；settle 的翻转面绑施法者自己。
 * 运动：读解环从外向内收，属性色的光晕在重织时由内向外翻出去。
 * 数：服务端把 `facets`（随特攻派生）交给发射器决定纹面条数与光带密度；命中抗性越硬，scale 越大。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const Conversion2Definition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "lens", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "facets", fallback: 6 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0x8FD8D8, alpha: [0.7, 0], light: "full", maxParticles: 26
                },
                {
                    name: "scan_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "facets", fallback: 8 }, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 0.95 },
                    direction: "inward", speed: [0.06, 0.1], spread: 3,
                    lifetime: [10, 16], size: [0.22, 0.06],
                    color: 0xCFE9E9, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "scan_motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "inward", speed: [0.07, 0.15], spread: 6,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8FBFF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 110
                }
            ]
        },
        settle: {
            duration: 46,
            exit: { stop: 26, drain: 32 },
            emitters: [
                {
                    name: "weave_halo", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "facets", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.85 },
                    direction: "outward", speed: [0.45, 0.7], spread: 2,
                    lifetime: [18, 26], size: [0.42, 0.9],
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [0.6, 0], light: "full", maxParticles: 130
                },
                {
                    name: "weave_mirror", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "facets", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.14, 0.3], spread: 10,
                    lifetime: [14, 24], size: [0.13, 0.03],
                    alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "weave_core", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 8, at: 2 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [8, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "weave_mist", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 4, rate: 10,
                    shape: { kind: "ring", radius: 0.72 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [22, 34], size: [0.28, 0.08],
                    color: 0x2F4A4A, alpha: [0.26, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "dud", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "facets", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.16, 0.24],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_conversion2", 1, Conversion2Definition);
