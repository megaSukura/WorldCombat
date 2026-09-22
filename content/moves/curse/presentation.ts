/**
 * 诅咒 / Curse 的客户端表现。
 *
 * 一句话：掌心聚起一团幽火（windup）→ 幽灵把一条紫黑的债线牵到对手身上、在他胸口烙下印记（hex），
 *   之后幽影不时浮起（haunt）、每一口债都把紫光从对手身上抽走（toll）→ 债走完，幽影安静升散（lift）；
 *   非幽灵则在自己身上套起一圈契约环，凶悍与硬壳随之而来（pact）。
 * 色相家族：幽紫 0x9B6BD6 作主体，暗紫 0x3A2352 作底，契约的赤红 0xC0503C 只出现在 pact。
 * 范围：hex 用 `data.path`（施法者 ↔ 目标）画 polyline，债从谁记到谁一眼可见；路径顶点每帧跟随双方。
 * 运动：债线沿两人连线、每口债把紫光向内抽进目标、退场时幽影上浮散去。
 * 数：每口债的份额 `data.share`、扣血规模 `data.burst`、契约等级 `data.gain` 来自本招算出的机制值。
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 */
const CurseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.75, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 14, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.05], spin: 8,
                    lifetime: [7, 13], size: [0.14, 0.05],
                    color: 0x9B6BD6, alpha: [0.7, 0], light: "full", maxParticles: 48 },
                { name: "gather_smoke", bind: "source", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 8, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.008, 0.03],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x3A2352, alpha: [0.4, 0], light: "world", maxParticles: 30 }
            ]
        },
        hex: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                { name: "debt_line", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.02, 0.09], trail: { minDistance: 0.1 },
                    lifetime: [7, 14], size: [0.16, 0.05],
                    color: 0x9B6BD6, alpha: [0.85, 0], light: "full", maxParticles: 120 },
                { name: "seal", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 12, at: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xB79AF0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40 },
                { name: "seal_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "pulses", fallback: 3 } }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [10, 18], size: [0.34, 0.7], sizeMode: "sin",
                    color: 0x3A2352, alpha: [0.6, 0], light: "world", maxParticles: 16 }
            ]
        },
        haunt: {
            exit: { drain: 28 },
            emitters: [
                { name: "shade", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02], spin: 10,
                    lifetime: [18, 30], size: [0.14, 0.3],
                    color: 0x3A2352, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 26 },
                { name: "shade_mote", bind: "target", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 10, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 26], size: [0.05, 0.01],
                    color: 0x9B6BD6, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 24 }
            ]
        },
        toll: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                { name: "drain", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "burst", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0x9B6BD6, alpha: [0.9, 0], light: "full", maxParticles: 60 },
                { name: "drain_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [9, 16], size: [0.28, 0.6], sizeMode: "sin",
                    color: 0x3A2352, alpha: [0.55, 0], light: "world", maxParticles: 12 }
            ]
        },
        pact: {
            duration: 30,
            exit: { stop: 13, drain: 20 },
            emitters: [
                { name: "ember", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "burst", fallback: 16 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.04],
                    color: 0xC0503C, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 44 },
                { name: "pact_ring", bind: "source", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "gain", fallback: 1 } }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [12, 20], size: [0.38, 0.78], sizeMode: "sin",
                    color: 0xC0503C, alpha: [0.6, 0], light: "full", maxParticles: 12 }
            ]
        },
        lift: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                { name: "rise", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 28], size: [0.16, 0.36],
                    color: 0x3A2352, alpha: [0.3, 0], light: "world", maxParticles: 26 },
                { name: "last_shade", bind: "target", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x9B6BD6, alpha: [0.35, 0], light: "full", maxParticles: 24 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_curse", 1, CurseDefinition);
