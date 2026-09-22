/**
 * 报复 / revenge 的客户端表现。
 *
 * 一句话：施法者屈膝站定、把一圈斗气从脚下收到拳上（身上伤得越重收得越多），随后朝对手踏出一步递出一拳；
 *   被这个对手本人打过时拳面炸开橙红的斗气与一只拳影，把对方一拳送开。
 * 色相家族：斗气橙（impact_fighting、fist、glowingsparkle_yellow）为主，怒火红（anger_red）只在「被本人打过」时进入。
 * 拍子：起 brace 0–30t ／ 递 drive 0–26t ／ 击 impact（未记仇）0–28t ／ 击 retort（记仇）0–28t ／ 空 miss。
 * 范围：impact／retort 的拳爆与地环绑命中点，尺寸由 `data.scale`（判定半径派生）决定；drive 的拳风沿 `data.direction` 前射。
 * 运动：brace 的斗气由外向内收、沿身体上移；drive 前后踏；命中由内向外炸开；retort 多一层向下压的拳影。
 * 数：`data.smash`（物攻与等级派生的拳风数）驱动各段发射量；`data.bruise`（缺失生命比例）决定 brace 的斗气量；
 *   `data.intensity`（最终威力派生）抬高命中爆发的亮度与尺寸。
 */
const RevengeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 20, shape: { kind: "hemisphere", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [7, 14], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE2662E, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "footing", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.4, 0.14],
                    color: 0xD9A24A, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "anger", bind: "source", offset: [0, 1.0, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.10, 0.02],
                    color: 0xE24B4B, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        drive: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "knuckles", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: { data: "smash", fallback: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "toward", speed: [0.06, 0.22], spread: 18,
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF0A24A, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.25, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "smash", fallback: 12 }, interval: 2, repeats: 5 },
                    shape: { kind: "line", length: 0.6 }, orient: "direction",
                    direction: "shape", speed: [0.1, 0.28], spread: 8,
                    lifetime: [5, 10], size: [0.10, 0.02],
                    color: 0xE2A85A, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "smash", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xF0A24A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0xC86A2E, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        retort: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "knuckle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1 },
                    shape: { kind: "point" }, direction: "shape",
                    lifetime: [10, 12], size: [0.7, 0.4], sizeMode: "index",
                    color: 0xFFB65A, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "smash", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.12, 0.38],
                    lifetime: [8, 14], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xF2643A, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "wrake", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "smash", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.14, 0.42], spread: 24,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [9, 16], size: [0.10, 0.02],
                    color: 0xE24B4B, alpha: [0.95, 0], light: "full", maxParticles: 110
                },
                {
                    name: "shock", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [10, 18], size: [0.6, 0.22],
                    color: 0xB04A2A, alpha: [0.7, 0], light: "world"
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wind", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 13], size: [0.12, 0.02],
                    color: 0xC8A070, alpha: [0.55, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_revenge", 1, RevengeDefinition);
