/**
 * 冰冷视线 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者双眼亮起紫光、目标身上落下锁定环；随后一道精神视线从眼中瞬间射出，落到目标上又跳向最近的
 *   下一个敌人，一路在敌人之间传递；每个被盯到的人身上炸开一圈精神冲击与霜，真的被冻住的人才罩上一层冰壳。
 * 色相家族：念力紫 0xB48CE8 与近白 0xF0E6FF 为主，冰冻的冷青 0x9FE0FF 只在冻结相关的层出现。
 * 层次：凝神（focus）→ 锁定（mark）→ 视线链（glare）→ 命中（impact）／冻结（frozen）／被挡（blocked）。
 * 范围：glare 用 `data.path`（施法者 + 每一次跳跃的落点）以 polyline 画出服务端结算用的同一串顶点，
 *   线连到谁就是谁被点到；视线跳空或被挡就停在最后一个真实跳点。frozen 只在服务端确认冻住时出现。
 * 运动：视线粒子沿 path 高速铺开并在每个落点向内收束，落点处的精神环向外扩散；被挡时在施法者身前打旋散去。
 * 数：`data.rate`（首目标威力派生）决定视线链的密度，`data.impactCount`（威力派生）决定命中冲击量，
 *   `data.chains` 决定画面的跳数，`data.jump` 标出这一击是第几跳、后续跳数按 `data.scale` 收小。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FreezingglareDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        focus: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "eye_glow", bind: "source", offset: [0, 0.85, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xF0E6FF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "psy_gather", bind: "source", offset: [0, 0.85, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 14, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08], spin: 40,
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0xB48CE8, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        mark: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "lock_ring", bind: "target", offset: [0, 0.6, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 18, shape: { kind: "ring", radius: 0.55, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.0, 0.05], spin: 50,
                    lifetime: [10, 16], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xB48CE8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "lock_spark", bind: "target", offset: [0, 0.7, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.0, 0.05],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xF0E6FF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        glare: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "sight_line", bind: "path", offset: [0, 0.9, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/moves/psychicsend",
                    shape: { kind: "polyline" }, positionJitter: [0.12, 0.12, 0.12],
                    rate: { data: "rate", fallback: 160 }, direction: "shape", speed: [0.02, 0.08], spin: 60,
                    lifetime: [5, 10], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xF0E6FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 240
                },
                {
                    name: "sight_aura", bind: "path", offset: [0, 0.9, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    shape: { kind: "polyline" }, positionJitter: [0.16, 0.16, 0.16],
                    rate: { data: "rate", fallback: 160 }, direction: "shape", speed: [0.04, 0.14], spin: 80,
                    lifetime: [6, 12], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xB48CE8, alpha: [0.6, 0], light: "full", maxParticles: 220
                },
                {
                    name: "frost_line", bind: "path", offset: [0, 0.9, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    shape: { kind: "polyline" }, positionJitter: [0.14, 0.14, 0.14],
                    rate: { data: "rate", fallback: 160 }, direction: "shape", speed: [0.0, 0.06], gravity: 0.006, drag: 0.94,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0x9FE0FF, alpha: [0.45, 0], light: "world", maxParticles: 160
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "psy_burst", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "impactCount", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xF0E6FF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "psy_chill", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: { data: "impactCount", fallback: 30 } }, amount: 2,
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.3], spin: 70,
                    lifetime: [8, 15], size: [0.18, 0.03],
                    color: 0xB48CE8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        frozen: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ice_shell", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 12, at: 1 }, amount: 1,
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.0, 0.03], spin: 16,
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x9FE0FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "freeze_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.26, 0.02],
                    color: 0x9FE0FF, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        blocked: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "scatter", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 24 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x9F86C8, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fade", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0xBFA8E0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_freezingglare", 1, FreezingglareDefinition);
