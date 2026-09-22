/**
 * 虫扑 / pounce 的客户端表现。
 *
 * 一句话：屈膝压地后沿一条高抬的抛物线甩过空中，身上抖落虫翼与尘点，落在目标背侧炸开一记虫系撞击，
 * 随后腿脚缠在目标身上、一圈足印与虫翼贴着它的腿转。
 * 色相家族：虫黄绿（0xA6C24A）与暖土黄为主，撞击处近白，无饱和色。
 * 拍子：起 crouch（压地）→ 扑 launch / leap（抛物线）→ 击 impact（落身）→ 缠 cling（腿脚缠足）。
 * 范围：launch 的抛物线与 leap 的拖尾就是身体飞过的同一条线，玩家读得出这一扑落在哪。
 * 运动：身体沿 `data.path` 抬起的中点划弧；虫翼与尘点沿弧线向后抛；命中后足印贴着目标腿边环绕。
 * 数：launch 的虫翼数量绑定 `data.motes`（速度与等级换算），跳跃高度绑定 `data.jump`（抛物线拱高），
 *   命中强度绑定 `data.intensity`（本击威力 / 50），缠身画面密度绑定 `data.stages`（掉速等级）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PounceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "wings", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xD8E8A0, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        launch: {
            duration: 26,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.04, 0.14], spread: 16,
                    lifetime: [6, 12], size: [0.18, 0.05], sizeMode: "index",
                    color: 0xA6C24A, alpha: [0.8, 0], light: "world", maxParticles: 120
                },
                {
                    name: "kick", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "lift", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.1, 0.3],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEAF6C8, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        leap: {
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: { data: "motes", fallback: 14 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "away", speed: [0.02, 0.1], gravity: 0.03, drag: 0.95,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xA6C24A, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.02, 0.08], gravity: 0.04, drag: 0.94,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "bug_hit", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.09, 0.28],
                    lifetime: [5, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xEAF6D0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 52
                },
                {
                    name: "swarm", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xA6C24A, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "skid", bind: "target", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        cling: {
            duration: { data: "tick", fallback: 60 },
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "grip", bind: "target", offset: [0, 0.28, 0], height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs", spriteFrom: "random",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.16, 0.05],
                    color: 0xA6C24A, alpha: [0.85, 0.15], light: "world", maxParticles: 18
                },
                {
                    name: "legs", bind: "target", offset: [0, 0.12, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 4, interval: 10, repeats: 20 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.22, 0.05],
                    color: 0x8FB03A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "land", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9C8250, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pounce", 1, PounceDefinition);
