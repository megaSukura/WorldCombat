/**
 * 大晴天 / sunnyday 的客户端表现。
 *
 * 一句话：施法者头顶聚起一圈暖光、把太阳请下来 → 落点铺开一片稳定的日照斑，暖光与热流从地面缓缓升起 →
 * 光里的人身上浮起暖芒，冻结化成一串水汽、身上的水被蒸成白雾。
 * 色相家族：暖金 0xFFC24A 作主体、浅金 0xFFE09A 作边缘、近白 0xFFFBE8 只给核心高光；蒸干的水汽用中性白灰。
 * 起击收：起 windup 22t ／击 burst 48t ／持 field 每 5 刻续期 ／击 sunlit 22t ／击 thaw / dry 各 20t。
 * 持续状态：field 是贴地的暖金光尘与缓慢上浮的热流，低密度、低 alpha，铺满烈日区但不遮视线；
 * 地面一圈金环画出「站哪里会被晒到」。热流向上升腾，不再压下一柱会读成伤害的黄光。
 * 机制驱动：烈日区半径决定光尘与金环的实际大小（data.scale = 半径/9），光尘数量直接读本招算出的 sunDensity。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 聚光 xsunboost       升腾＋内收   0.18-0.05 10-18 0.9→0 ≤40
 * burst  金环 largering       贴地外扩     3.2-9.0  20-34 0.6→0 ≤40
 * burst  热流 wisp            贴地升腾     0.18-0.05 18-32 0.5→0 ≤280
 * burst  光尘 glowingsparkle_yellow 上浮 0.10-0.03 16-28 0.6→0 ≤360
 * field  光尘 glowingsparkle_yellow 上浮＋脉冲 0.08-0.02 18-32 0.32→0 ≤300
 * field  热流 wisp            缓慢升腾     0.12-0.03 20-36 0.22→0 ≤120
 * field  暖芒 xsunboost       上浮         0.06-0.02 16-28 0.22→0 ≤140
 * sunlit 暖芒 xsunboost       球面外散     0.14-0.03 10-20 0.9→0 ≤70
 * thaw  水汽 smoke           升腾         0.32-0.08 18-32 0.5→0 ≤40
 * dry   白雾 tinydust         升腾         0.05-0.01 14-24 0.45→0 ≤40
 */
const SunnyDayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 1.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: 14, interval: 2, repeats: 6 }, shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0xFFE09A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40 }
            ]
        },
        burst: {
            duration: 48,
            exit: { stop: 26, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.22, 0.34],
                    lifetime: [20, 34], size: [3.2, 0.6],
                    color: 0xFFC24A, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 40 },
                { name: "updraft", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.03, 0.09], drag: 0.98,
                    lifetime: [18, 32], size: [0.18, 0.05],
                    color: 0xFFE09A, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 280 },
                { name: "glow", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 56, interval: 4, repeats: 6 }, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0xFFFBE8, alpha: [0.5, 0], light: "full", maxParticles: 120 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "motes", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "density", fallback: 30 }, shape: { kind: "circle", radius: 8.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 32], size: [0.08, 0.02],
                    color: 0xFFC24A, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 300 },
                { name: "warmth", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 14, shape: { kind: "circle", radius: 8.0 },
                    direction: "up", speed: [0.008, 0.03],
                    lifetime: [16, 28], size: [0.06, 0.02],
                    color: 0xFFE09A, alpha: [0.22, 0], light: "full", maxParticles: 140 },
                { name: "thermal", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 10, shape: { kind: "circle", radius: 8.0 },
                    direction: "up", speed: [0.012, 0.035], drag: 0.985,
                    lifetime: [20, 36], size: [0.12, 0.03],
                    color: 0xFFE09A, alpha: [0.22, 0], light: "full", maxParticles: 120 },
                { name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: 8.4 },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [24, 40], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0xFFE09A, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 40 }
            ]
        },
        sunlit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "flush", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xFFFBE8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70 },
                { name: "rise", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.1],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE09A, alpha: [0.9, 0], light: "full", maxParticles: 40 }
            ]
        },
        thaw: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "melt", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.14], drag: 0.94,
                    lifetime: [18, 32], size: [0.32, 0.08],
                    color: 0xFFFBE8, alpha: [0.5, 0], light: "world", maxParticles: 40 },
                { name: "drops", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.1], gravity: 0.04,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xEAF7FF, alpha: [0.7, 0], light: "full", maxParticles: 30 }
            ]
        },
        dry: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "steam", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xFFFBE8, alpha: [0.45, 0], light: "world", maxParticles: 40 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sunnyday", 1, SunnyDayDefinition);
