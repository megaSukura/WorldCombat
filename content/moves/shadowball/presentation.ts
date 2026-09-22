/**
 * 暗影球 / shadowball —— 客户端表现。
 *
 * 一句话：一团黑影在施法者身前被攥紧 → 沿直线飞出、一路剥落阴气 → 命中活物时炸开成一圈紫黑阴气与碎缕 →
 * 若碾防生效，目标身上短暂贴住一层不散的影子；打空只留一下散影。
 * 色相家族：紫黑（0x2E2244 / 0x6B4FA8）为主，近白（0xD8CCFF）只给击点；碎缕收在灰紫。
 * 拍子：起 windup（攥影）→ 行 travel（飞行）→ 击 burst（炸开）→ 缠 cling（附身）／空 fizzle。
 * 范围：单发点射，由 travel 的直线轨迹读出；没有地面范围。
 * 运动：影球沿直线飞行（服务端速度），尾迹按距离剥落；命中后碎缕向外抛。
 * 数：burst 的碎缕数绑定 `data.shards`（特攻与等级换算），强度绑定 `data.intensity`（威力 / 70）。
 */
const ShadowBallDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.15, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.2, 0.03],
                    color: 0x2E2244, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9A7BFF, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "bolt_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 40, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.24, 0.05],
                    color: 0x2E2244, alpha: [0.92, 0], light: "world", maxParticles: 40
                },
                {
                    name: "bolt_wisps", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.28 }, rate: { data: "shards", fallback: 20 },
                    direction: "away", speed: [0.0, 0.06], spread: 24,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0x6B4FA8, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "burst_impact", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/moves/shadowball_impact",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 9, size: [0.36, 0.05], sizeMode: "index",
                    color: 0xD8CCFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "burst_ring", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0x4A356F, alpha: [0.7, 0], light: "world", maxParticles: 6
                },
                {
                    name: "burst_shards", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.18], spread: 30,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0x6B4FA8, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        cling: {
            duration: 140,
            exit: { stop: 18, drain: 24 },
            emitters: [
                {
                    name: "cling_veil", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 4, shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [14, 26], size: [0.2, 0.06],
                    color: 0x2E2244, alpha: [0.5, 0.06], light: "world", maxParticles: 14
                },
                {
                    name: "cling_motes", bind: "target", offset: [0, 0.1, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle", spriteFrom: "age",
                    rate: 3, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0x9A7BFF, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "fizzle_smoke", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 20], size: [0.2, 0.04],
                    color: 0x4A356F, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "fizzle_shards", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.25 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x6B4FA8, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shadowball", 1, ShadowBallDefinition);
