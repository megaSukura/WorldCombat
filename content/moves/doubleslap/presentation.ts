/**
 * 连环巴掌 / doubleslap 的客户端表现。
 *
 * 一句话：施法者抬掌聚起一线掌风，随后一只手掌接一只手掌地左右来回扇，两颊之间掌印交替炸开一小簇粉白掌风；
 *   对手被拨得左右晃，没扇到就只剩一道擦空的手影。
 * 色相家族：掌风粉白（0xF6C9D2 偏色）与命中近白（0xFFFFFF）做本体与强调，掌风碎屑（tinydust 原色）只做余韵。
 * 拍子：起 raise（抬掌聚风）→ 抽 swing（一记记掌影）→ 中 hit / 空 miss·away → 收 settle。
 * 范围：本招是贴身单体连抽，画面靠贴在对手身上的一记记掌印标出「谁会被抽到」，没有地面轮廓。
 * 运动：`swing` 从服务端算出的那只掌的真实起点（`data.point`，左右交替）朝目标扇出，所以左右掌各有自己的起点；
 *   掌影的滚转由 `data.tilt`（左右交替的 ±角度）驱动，读作「一会从左扇、一会从右扇」。
 *   命中 `hit` 落在目标朝这只掌最近的脸侧接触点；够不着时 `away` 从掌位朝脱出方向收手。
 * 数：`data.smack`（物攻换算的掌风量）绑定每一掌与命中的发射量，`data.index` / `data.slaps` 让画面读出演到第几掌、
 *   还剩几掌，`data.intensity`（单掌威力派生）抬高亮度，`data.scale`（臂展换算）让大个子的掌风更大。
 */
const DoubleslapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 4 },
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, -0.25], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xF6C9D2, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 44
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "circle", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.05, drag: 0.92,
                    lifetime: [7, 12], size: [0.06, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        swing: {
            duration: 12,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "palm", bind: "point", offset: [0, 0.25, 0], fit: "none",
                    orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "box", size: [0.5, 0.05, 0.5], rotation: [0, 0, { data: "tilt", fallback: 32 }] },
                    direction: "toward", speed: [0.35, 0.95], spread: 6,
                    lifetime: [5, 9], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "spark", bind: "target", offset: [0, 0.45, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: { data: "smack", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.22], spread: 26, drag: 0.92,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xF6C9D2, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.36, 0.08],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "chaff", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "smack", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28, gravity: 0.07, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xE8D6DA, alpha: [0.45, 0], light: "world", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.35, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "smack", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xE8D6DA, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        away: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "slip", bind: "point", fit: "none", offset: [0, 0.35, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.4 } }, direction: "shape", speed: [0.03, 0.14], spread: 14, drag: 0.9,
                    lifetime: [7, 12], size: [0.06, 0.02],
                    color: 0xE8D6DA, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "rest", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [7, 12], size: [0.14, 0.04],
                    color: 0xF6C9D2, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doubleslap", 1, DoubleslapDefinition);
