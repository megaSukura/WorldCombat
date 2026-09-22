/**
 * 恶意追击 / assurance 的客户端表现。
 *
 * 一句话：施法者伏低、身侧拢起一圈暗紫的羽，锁定目标身上最近受创的位置；随后贴着地面追出去，
 *   伤口还热着时命中炸开一圈更密更亮的暗紫（羽尖泛红），没追上就散在前方。
 * 色相家族：暗紫（impact_dark、pursuit、glowingsparkle）为主，血红（anger_red）只在「目标带伤」时进入。
 * 拍子：起 stalk 0–28t ／ 追 lunge 0–30t ／ 击 strike（未带伤）0–28t ／ 击 ambush（带伤）0–28t ／ 空 miss。
 * 范围：strike／ambush 的点爆与环绑命中点，尺寸由 `data.scale`（判定半径派生）决定；lunge 的速度线沿 `data.direction` 前射。
 * 运动：stalk 的羽由外向内收；lunge 贴地前拖；命中由内向外炸；带伤时多一层向内咬合的暗红。
 * 数：`data.quills`（物攻与速度派生的暗羽数）驱动各段的发射量；`data.wounded` 决定是否进入爆发段；
 *   `data.intensity`（最终威力派生）抬高命中爆发的亮度与尺寸。
 */
const AssuranceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stalk: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "plume", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/moves/pursuit",
                    rate: { data: "quills", fallback: 16 }, shape: { kind: "hemisphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16], spread: 24,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x5A3C86, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "seam", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [7, 13], size: [0.08, 0.01],
                    color: 0x9B7AD0, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        lunge: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "quilltrail", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/moves/pursuit",
                    rate: { data: "quills", fallback: 16 }, trail: { minDistance: 0.28 },
                    direction: "outward", speed: [0.02, 0.1], spread: 18,
                    lifetime: [8, 15], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x4A3070, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "dash", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "quills", fallback: 16 }, interval: 2, repeats: 6 },
                    shape: { kind: "line", length: 0.7 }, orient: "direction",
                    direction: "shape", speed: [0.1, 0.3], spread: 10,
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0x7A5AB0, alpha: [0.7, 0], light: "full", maxParticles: 100
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "quills", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [7, 13], size: [0.30, 0.04], sizeMode: "index",
                    color: 0x9B7AD0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ring", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0x6A4AB0, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        ambush: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "quills", fallback: 22 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.12, 0.36],
                    lifetime: [8, 14], size: [0.40, 0.05], sizeMode: "index",
                    color: 0xB08AE0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "wound", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "quills", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.14, 0.4], spread: 22,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 16], size: [0.10, 0.02],
                    color: 0xD64B4B, alpha: [0.95, 0], light: "full", maxParticles: 110
                },
                {
                    name: "ring", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0x8A3A6A, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "disperse", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.02,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x6A5A82, alpha: [0.5, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_assurance", 1, AssuranceDefinition);
