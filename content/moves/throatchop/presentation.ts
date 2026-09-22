/**
 * 地狱突刺 / throatchop 的客户端表现。
 *
 * 一句话：暗红的气在爪上收拢，一记直取咽喉的突刺递出去；命中处炸开一团暗色冲击，咽喉上留下
 *   一圈暗红的封声印记，印记在目标缓过来之前一直沉着。
 * 色相家族：暗红 0x7A1E3A 作主体、深紫黑 0x2A0A18 作阴影，近白与浅粉 0xF0B8C8 只做印记与高光。
 * 拍子：起（windup 聚气）→ 刺（thrust 沿方向递出、hit 命中炸开）→ 封（linger 咽喉印记）→ 收（recover 褪去／subside 被硬解／whiff 落空）。
 * 范围：thrust 的直线长度绑服务端 data.reach（真实突刺距离），玩家看得出这一刺够到哪。
 * 运动：聚气朝手部收束，突刺沿 data.direction 直出；命中在目标身上向外炸开。
 * 数：命中冲击的量随 data.intensity（威力派生），突刺的密度随 data.scale（距离派生）。
 */
const ThroatchopDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    rate: 22, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [9, 15], size: [0.16, 0.03],
                    color: 0x7A1E3A, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x2A0A18, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        thrust: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "reach_line", bind: "source", offset: [0, 0.55, 0], height: 0, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 120, shape: { kind: "line", length: { data: "reach", fallback: 2.8 } },
                    direction: "shape", speed: [0.2, 0.6],
                    lifetime: [4, 8], size: [0.28, 0.05], sizeMode: "index",
                    color: 0x7A1E3A, alpha: [0.9, 0], light: "full", maxParticles: 160
                },
                {
                    name: "reach_spark", bind: "source", offset: [0, 0.55, 0], height: 0, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 30, shape: { kind: "line", length: { data: "reach", fallback: 2.8 } },
                    direction: "shape", speed: [0.3, 0.8],
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xF0B8C8, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 30,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xF0B8C8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "seal_ring", bind: "target", offset: [0, 0.2, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.34, 0.7], sizeMode: "linear",
                    color: 0x7A1E3A, alpha: [0.85, 0], light: "full", maxParticles: 10
                },
                {
                    name: "hit_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [12, 20], size: [0.2, 0.05],
                    color: 0x2A0A18, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        linger: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "throat_seal", bind: "target", offset: [0, 0.2, 0], height: 0.84,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [18, 28], size: [0.13, 0.03], sizeMode: "sin",
                    color: 0x7A1E3A, alpha: [0.4, 0.02], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "throat_mote", bind: "target", offset: [0, 0.15, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 2, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [16, 26], size: [0.06, 0.01],
                    color: 0xF0B8C8, alpha: [0.35, 0], light: "full", maxParticles: 10
                }
            ]
        },
        recover: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fade_seal", bind: "target", offset: [0, 0.25, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xF0B8C8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        subside: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "break_seal", bind: "target", offset: [0, 0.15, 0], height: 0.84,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.24], spread: 20,
                    lifetime: [7, 13], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x7A1E3A, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "source", offset: [0, 0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x2A0A18, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_throatchop", 1, ThroatchopDefinition);
