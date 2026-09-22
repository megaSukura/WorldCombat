/**
 * 迷人 / Attract 的客户端表现。
 *
 * 一句话：施法者掌心聚起一颗跳动的粉心 → 心脱手飞过战场、拖着一串小心跳 → 撞在目标身上炸开一圈心形与星点，
 *         此后那目标头顶便常悬一颗小心；它心软时起一阵粉雾，被拽动时身后又拖出一串心，挣脱时碎成星点消散。
 * 色相家族：粉 0xFF6FA8 作主体；暖白 0xFFE6F0 作高光；只在被牵动的一瞬用更深的心红强调。
 * 起击收：起 windup 14t ／出 launch 20t ／击 charm 34t ／受 hesitate 30t、pull 26t、leash 24t、snap 18t、fade 20t ／持 linger 续期。
 * 持续状态：linger 低密度放在头顶上方，读得出被魅惑但看得清目标。
 * 机制驱动：charm 的爆发量由本招算出的着迷时长折算（charmBurst = 时长/8），越久的心炸得越开。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 主体 infatuation_heart   球面上浮          0.22-0.06 12-22 0.9→0   ≤24
 * windup 细节 glowingsparkle_pink 环上浮            0.1-0.02  10-18 0.8→0   ≤30
 * launch 强调 infatuation_heart   球面外散＋drag    0.26-0.05 12-22 0.95→0  ≤30
 * launch 细节 smallsparkle        环外散            0.05-0.01 8-16  0.8→0   ≤40
 * charm  强调 infatuation_heart   球面外爆＋drag    0.26-0.05 14-26 0.95→0  ≤60
 * charm  细节 glowingsparkle_pink 球面外散          0.12-0.02 10-20 1→0     ≤70
 * charm  轮廓 smallring           环上浮、sin        0.35-0.72 12-20 0.6→0   ≤16
 * hesitate 主体 largeobscure_pink 球面上浮          0.24-0.42 14-24 0.35→0  ≤40
 * hesitate 细节 fadeheart_white   环上浮            0.16-0.04 12-20 0.9→0   ≤24
 * pull  主体 infatuation_heart    环上浮            0.18-0.04 12-22 0.85→0  ≤40
 * pull  细节 tinydust             环上浮            0.05-0.01 10-18 0.4→0   ≤40
 * leash 主体 infatuation_heart    环上浮            0.18-0.04 12-22 0.85→0  ≤40
 * snap  细节 smallsparkle         环外散            0.06-0.01 8-14  0.6→0   ≤30
 * linger 主体 infatuation_heart   环上浮            0.15-0.03 16-30 0.5→0   ≤24
 * linger 细节 smallsparkle        球面贴附、上浮    0.05-0.01 12-22 0.45→0  ≤30
 * fade  主体 fadeheart_white      球面上浮          0.2-0.03  14-24 0.6→0   ≤20
 * fizzle 强调 infatuation_heart   球面外散          0.16-0.03 10-18 0.7→0   ≤14
 */
const AttractSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 6 },
            emitters: [
                { name: "caster_hearts", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.22, 0.06], sizeMode: "sin",
                    color: 0xFF6FA8, alpha: [0.9, 0], light: "full", maxParticles: 24 },
                { name: "caster_glint", bind: "source", offset: [0, 0.65, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFE6F0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 30 }
            ]
        },
        launch: {
            duration: 20,
            exit: { stop: 8, drain: 10 },
            emitters: [
                { name: "launch_burst", bind: "source", offset: [0, 0.65, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.92,
                    lifetime: [12, 22], size: [0.26, 0.05],
                    color: 0xFF6FA8, alpha: [0.95, 0], light: "full", maxParticles: 30 },
                { name: "launch_trail", bind: "source", offset: [0, 0.65, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    trail: { minDistance: 0.18 }, rate: 40, shape: { kind: "point" }, direction: "away", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0xFFE6F0, alpha: [0.8, 0], light: "full", maxParticles: 40 }
            ]
        },
        charm: {
            duration: 34,
            exit: { stop: 14, drain: 18 },
            emitters: [
                { name: "charm_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "charmBurst", fallback: 40 } }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.02, drag: 0.92,
                    lifetime: [14, 26], size: [0.24, 0.05],
                    color: 0xFF6FA8, alpha: [0.95, 0], light: "full", maxParticles: 60 },
                { name: "charm_sparkle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "charmBurst", fallback: 40 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xFFE6F0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 70 },
                { name: "charm_ring", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [12, 20], size: [0.35, 0.72], sizeMode: "sin",
                    color: 0xFF6FA8, alpha: [0.6, 0], light: "full", maxParticles: 16 }
            ]
        },
        hesitate: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                { name: "hesitate_haze", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: 14, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.24, 0.42],
                    color: 0xFF9AC4, alpha: [0.35, 0], light: "world", maxParticles: 40 },
                { name: "hesitate_heart", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.16, 0.04],
                    color: 0xFF6FA8, alpha: [0.9, 0], light: "full", maxParticles: 24 }
            ]
        },
        pull: {
            duration: 26,
            exit: { stop: 10, drain: 14 },
            emitters: [
                { name: "pull_trail", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 10, interval: 2, repeats: 3 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0xFF6FA8, alpha: [0.85, 0], light: "full", maxParticles: 40 },
                { name: "pull_dust", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFE6F0, alpha: [0.4, 0], light: "full", maxParticles: 40 }
            ]
        },
        leash: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                { name: "leash_hearts", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 12, interval: 2, repeats: 3 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [12, 22], size: [0.18, 0.04],
                    color: 0xFF6FA8, alpha: [0.85, 0], light: "full", maxParticles: 40 },
                { name: "leash_taut", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3 }, shape: { kind: "circle", radius: 0.42, thickness: 0.85 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.42, 0.2], sizeMode: "index",
                    color: 0xFF9AC4, alpha: [0.6, 0], light: "full", maxParticles: 24 }
            ]
        },
        snap: {
            duration: 18,
            exit: { stop: 8, drain: 10 },
            emitters: [
                { name: "snap_spark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFE6F0, alpha: [0.6, 0], light: "full", maxParticles: 30 }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                { name: "lingering_heart", bind: "target", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 4, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.045],
                    lifetime: [16, 30], size: [0.15, 0.03],
                    color: 0xFF6FA8, alpha: [0.5, 0], light: "full", maxParticles: 24 },
                { name: "lingering_sparkle", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xFFE6F0, alpha: [0.45, 0], light: "full", maxParticles: 30 }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                { name: "fade_heart", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0xFF9AC4, alpha: [0.6, 0], light: "world", maxParticles: 20 }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                { name: "fizzle_heart", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFF9AC4, alpha: [0.7, 0], light: "world", maxParticles: 14 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_attract", 1, AttractSceneDefinition);
