/**
 * 啄食 / pluck 的客户端表现。
 *
 * 一句话：施法者抬头张开喙、翅下卷起细细的风，随后喙沿真实瞄准伸出去，到第一个碰到的身体或方块为止；
 * 若啄到树果，绿色的果屑从接触点倒着飞回嘴边，紧接着暖绿的光顺着身体升起、把果子吞进肚子。
 * 色相家族：风白（gust / speedlines）作运动，飞行紫（impact_flying）作命中，果绿（smallleaf / glowingsparkle）
 * 只在“啄到树果”时进入；三者合起来读作“风—啄—吞”。
 * 拍子：起（raise 抬头）→ 啄（peck 喙线伸到真实接触点）→ 击（hit 命中）→ 得（gain 吞果）／撞墙（wall）／被挡（ward）／空（miss）。
 * 范围：peck 沿 `data.path` 的两个端点拉出喙线，线画到哪就是 trace 判定的接触点；朝上瞄准时同一条线自然抬起。
 * 运动：抬头时风从翅下向上卷；喙出时速度线沿喙线向前射，收喙由服务端把 path 缩回口部；命中是短促的紫白外爆，
 *   果屑沿 `data.back`（瞄准方向的反向）从接触点飞回施法者；吞果是暖绿由下向上。
 * 数：`data.motes`（速度派生的羽屑数）驱动抬头与命中的粒子量；`data.bits`（啄到树果时的果屑数，否则 0）
 *     单独驱动果屑层；`data.gain`（回复／能力等级／解异常折算的层数）驱动吞下的量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PluckDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 22,
            exit: { stop: 12, drain: 12 },
            emitters: [
                {
                    name: "updraft", bind: "source", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    rate: 22, shape: { kind: "hemisphere", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.14, 0.02],
                    color: 0xE8F0FF, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "plume", bind: "source", offset: [0, 0.6, 0.3], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 3, interval: 4, repeats: 3 }, shape: { kind: "line", length: 0.4, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [5, 11], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        peck: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lane", bind: "path", fit: "none", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, rate: 60, speed: [0.2, 0.5],
                    direction: "shape", spread: 4,
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0xF0F6FF, alpha: [0.55, 0], light: "full", maxParticles: 120
                },
                {
                    name: "gust", bind: "path", fit: "none", height: 0.02,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    shape: { kind: "polyline" }, rate: 26, speed: [0.08, 0.24],
                    direction: "outward", spread: 12,
                    lifetime: [6, 13], size: [0.16, 0.03],
                    color: 0xDCE8FF, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "point", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6D8FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 32
                },
                {
                    name: "feathers", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02, spin: 16,
                    lifetime: [8, 18], size: [0.07, 0.01],
                    color: 0xFFFFFF, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "bits", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "bits", fallback: 0 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: [{ data: "back.0", fallback: 0 }, { data: "back.1", fallback: 1 }, { data: "back.2", fallback: 0 }],
                    speed: [0.14, 0.34], gravity: 0.01, spin: 12,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xA8D050, alpha: [0.9, 0], light: "world", maxParticles: 80
                }
            ]
        },
        gain: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "swallow", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "gain", fallback: 6 } }, shape: { kind: "cylinder", radius: 0.3, length: 0.9 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xA8E070, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "warm", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 16], size: [0.45, 0.16],
                    color: 0xA8E070, alpha: [0.55, 0], light: "full", maxParticles: 4
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scrape", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 6 } }, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26, gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xD8E4F0, alpha: [0.6, 0], light: "world", maxParticles: 28
                }
            ]
        },
        ward: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "soak", bind: "point", fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [6, 14], size: [0.1, 0.02],
                    color: 0xD8E4F0, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "sweep", bind: "point", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xD8E4F0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pluck", 1, PluckDefinition);
