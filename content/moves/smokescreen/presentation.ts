/**
 * 烟幕 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一口浓烟从口边扑向落点，落地摊成一片低垂的灰云；云留在那里慢慢翻涌，走进去的人从云里咳出烟。
 *
 * 色相家族：一个灰蓝家族（0x6E6E78 主体／0x8A8A94 细节／0x53535C 云底），近白只在离散的烟丝上。
 * 层次：口边聚烟（起手）→ 烟柱扑出（飞行）→ 云团翻涌＋地面烟脚（停留，范围本身就是云半径）→ 呛咳烟（命中）→ 余烟（持续）。
 * 起击收：gather（攒烟）→ puff（扑出）→ bloom（炸开）→ cloud（停留）→ choked／linger（中招与余味）。
 * 持续状态：云可以密、可以挡视线——遮挡是这招的目的，云层刻意写得比一般持续状态更浓。
 * 数：云团发射率绑定 data.density（体重换算），云半径与地面烟脚由 data.scale（半径 / 2.1）铺开。
 */
const SmokescreenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 18,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_curl", bind: "source", offset: [0, 0.15, 0], height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x8A8A94, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "gather_choke", bind: "source", offset: [0, 0.1, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.2, 0.34],
                    color: 0x6E6E78, alpha: [0.3, 0], light: "world", maxParticles: 18
                }
            ]
        },
        puff: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "puff_jet", bind: "source", offset: [0, 0.12, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "density", fallback: 40 } },
                    direction: [{ data: "direction.0", fallback: 1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    spread: 18, speed: [0.35, 0.7], drag: 0.9,
                    lifetime: [12, 22], size: [0.3, 0.5],
                    color: 0x6E6E78, alpha: [0.75, 0], light: "world", maxParticles: 140
                },
                {
                    name: "puff_veil", bind: "source", offset: [0, 0.12, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: { data: "density", fallback: 16 } },
                    direction: [{ data: "direction.0", fallback: 1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    spread: 22, speed: [0.25, 0.55], drag: 0.88,
                    lifetime: [16, 28], size: [0.34, 0.6],
                    color: 0x8A8A94, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "bloom_core", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 2.1 } },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [18, 32], size: [0.24, 0.46],
                    color: 0x6E6E78, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "bloom_ground", bind: "point", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.1 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [14, 24], size: [0.3, 0.8],
                    color: 0x53535C, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        cloud: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "cloud_body", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: { data: "density", fallback: 40 }, shape: { kind: "sphere", radius: 2.1 },
                    direction: "up", speed: [0.005, 0.025], drag: 0.96, spin: 4,
                    lifetime: [30, 54], size: [0.28, 0.5],
                    color: 0x6E6E78, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 90
                },
                {
                    name: "cloud_foot", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    rate: 14, shape: { kind: "circle", radius: 2.1 },
                    direction: "up", speed: [0.005, 0.02], drag: 0.97,
                    lifetime: [26, 46], size: [0.3, 0.52],
                    color: 0x53535C, alpha: [0.32, 0], light: "world", maxParticles: 60
                },
                {
                    name: "cloud_mote", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 2.0 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 36], size: [0.06, 0.01],
                    color: 0xB8B8BE, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        },
        choked: {
            duration: 28,
            emitters: [
                {
                    name: "choked_cough", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [14, 26], size: [0.22, 0.4],
                    color: 0x6E6E78, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "choked_ring", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [12, 18], size: [0.28, 0.55],
                    color: 0x8A8A94, alpha: [0.45, 0], light: "world", maxParticles: 4
                }
            ]
        },
        linger: {
            duration: { data: "tick", fallback: 60 },
            exit: { drain: 26 },
            emitters: [
                {
                    name: "linger_wisp", bind: "target", offset: [0, 0.25, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 4, shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8A8A94, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_smokescreen", 1, SmokescreenDefinition);
