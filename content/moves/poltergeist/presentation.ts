/**
 * 灵骚 / poltergeist 的客户端表现。
 *
 * 一句话：施法者掌心聚起一团幽紫念火，目标手里的东西先是一颤，随后被扯离手边、沿一条偏出的弧线折返，
 * 砸回主人身上时炸开一片幽火；bind 开启时那件道具贴着目标不散。
 * 色相家族：幽紫（smoke / impact_ghost / psyswirl）为主，青白（aura_white / sparkle）作念力的边光。
 * 拍子：起（channel 聚念）→ 颤（shiver 道具一颤）→ 离（pull 扯离）→ 飞（flight 折返）→ 击（slam 砸回）／空（fizzle）。
 * 范围：slam 绑命中点，画出的就是被砸中的位置；操纵距离由服务端判定，远火在水面/地面上拖出可见的折返弧线。
 * 运动：聚念时幽火向内收拢，目标处短暂震颤，道具沿偏出的弧线折返，砸中时向外炸开。
 * 数：`data.motes`（特攻派生的幽火数）驱动各幕的粒子量；`data.intensity`（本击伤害占比）放大砸回的爆发。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PoltergeistDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        channel: {
            duration: 22,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "seance", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 30, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0x8E6BB0, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 22, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xC9F0E8, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        shiver: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "tremor", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xA98CC8, alpha: [0.55, 0], light: "full", maxParticles: 40
                }
            ]
        },
        pull: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "grasp", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 13], size: [0.11, 0.02],
                    color: 0x5E4378, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "tendril", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 30, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.12, 0.02],
                    color: 0xB79CD4, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        flight: {
            duration: 36,
            exit: { stop: 26, drain: 16 },
            emitters: [
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 44, shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.01, 0.06],
                    lifetime: [5, 11], size: [0.07, 0.01],
                    color: 0x9A78BC, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xE6D8F2, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "wisp", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.26], drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xBFE8DC, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "halo", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.85 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.44, 0.16],
                    color: 0x9A78BC, alpha: [0.55, 0], light: "full", maxParticles: 4
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "disperse", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0x6E5A80, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_poltergeist", 1, PoltergeistDefinition);
