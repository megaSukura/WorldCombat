/**
 * 嚣张 / powertrip 的客户端表现。
 *
 * 一句话：施法者挺起身、身上按提升项数喷起暗色气焰 → 贴地直冲、身后拖出暗紫速度线与翻滚的暗烟 →
 *   撞上的人身上炸开暗色冲击、被顶得往外飞 → 猛进时冲势不停，能看到它从那具身体里穿过去。
 * 色相家族：暗紫（0x4A2E8A 主体烟 / 0x7A4BC8 气焰与速度线 / 0xC9A9FF 只做细碎高光），怒气红只做起手强调。
 * 拍子：起 boast（0–10t 喷气焰）→ 冲 rush（贴地直冲）→ 击 hit（撞上）→ 穿 through（猛进第二人）→ 收 miss。
 * 范围：这是一记接触冲撞，冲击画在命中者身上；rush 的速度线沿身位历史拖尾，画出的就是冲过的路线。
 * 运动：rush 沿施法者历史拖出速度线与暗烟；hit 从命中者向外炸开并把人顶飞。
 * 数：boast／rush 的气焰量绑 `data.plumes`（提升项数与架势层数派生），hit 的强度绑 `data.intensity`（本撞威力 / 60）。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const PowerTripDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        boast: {
            duration: 12,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "plumes", bind: "source", offset: [0, 0.1, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "plumes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.24, 0.06],
                    color: 0x4A2E8A, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "flare", bind: "source", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: { data: "raised", fallback: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xC9A9FF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        rush: {
            duration: 30,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "speed", bind: "source", offset: [0, 0.32, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 26, trail: { minDistance: 0.3 },
                    shape: { kind: "box", size: [0.26, 0.3, 0.26] },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [3, 6], size: [0.16, 0.03],
                    color: 0x7A4BC8, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.1, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "plumes", fallback: 10 }, trail: { minDistance: 0.32 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x4A2E8A, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.07, 0.01],
                    color: 0x8A6BD0, alpha: [0.45, 0], light: "world", maxParticles: 100
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.18, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xC9A9FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.28, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "boost", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.26], spin: 12,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0x7A4BC8, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        through: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shove", bind: "target", offset: [0, 0.2, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x7A4BC8, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x8A6BD0, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powertrip", 1, PowerTripDefinition);
