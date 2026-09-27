/**
 * 千变万花 / flowertrick 的客户端表现。
 *
 * 一句话：施法者理好一束花、扬手锁定落点掷出；花束沿真实抛物线翻飞（高抛时飞得更高、更慢），第一次碰到敌人
 *   就整束绽开、花瓣向四面扑开；碰到地面或墙则只散瓣。
 * 色相家族：花粉（0xF0A6C8 / 0xF6D6E6）为主体，近白（0xFFF2F6）在花瓣与强调，草绿（0x8CC24E）只在茎叶的小面积。
 * 拍子：起 windup（理花）→ 行 flight（花束沿真实弧线飞行）→ 击 bloom（碰到敌人绽开）→ 收 miss（碰地/墙或飞尽散花）。
 * 范围：bloom 的绽开半径由判定半径与花瓣密度决定，只画真实碰到的那一点，不铺大圈、不留花地。
 * 运动：flight 由动作拥有的 actionScenes 绑定真实弹体，弧线由服务端解出的初速决定；没有追踪，也没有二次爆。
 * 数：`data.petals`（物攻与等级派生）决定飞行与绽开的花瓣密度，`data.intensity`（绽开威力派生）决定强弱。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FlowertrickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09], spin: 60,
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xF6D6E6, alpha: [0.75, 0], light: "full", maxParticles: 44
                },
                {
                    name: "gather_spark", bind: "source", offset: [0, 0.05, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xFFF2F6, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 120,
            exit: { stop: 96, drain: 18 },
            emitters: [
                {
                    name: "petals", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    rate: { data: "petals", fallback: 20 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "away", speed: [0.02, 0.1], spread: 40, spin: 90,
                    lifetime: [7, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xF0A6C8, alpha: [0.9, 0], light: "full", maxParticles: 140
                },
                {
                    name: "leaf", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    trail: { minDistance: 0.3 }, rate: 8,
                    direction: "away", speed: [0.02, 0.08], spread: 30, spin: 120,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x8CC24E, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        bloom: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: { data: "petals", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26, spin: 120,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [12, 22], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xF0A6C8, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.04, 0.18],
                    lifetime: 8, size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF2F6, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 12
                },
                {
                    name: "confetti", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spin: 200,
                    gravity: 0.04, drag: 0.93,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0xFFF2F6, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spin: 90, gravity: 0.02,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xF0A6C8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flowertrick", 1, FlowertrickDefinition);
