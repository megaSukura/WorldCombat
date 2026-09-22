/**
 * 愤怒粉 / Rage Powder 的粒子语言。
 *
 * 一句话：抖一抖翅膀把粉从身上抖开（windup）→ 一团黄绿的粉尘在自己周围铺成一圈、缓缓打转（cloud）→
 *   每隔一会儿粉尘向里一收，把云里的敌人兜住（draw）→ 时间到了粉尘落定散去（fade）。
 * 色相家族：粉尘黄绿 0xC8D97A 为主体，近白 0xEEF3C8 做高光，暗橄榄 0x6E7A3A 做云底。
 * 拍子：起 windup 0–12t ／ 云 cloud（持续，随节奏脉动）／ 吸 draw 0–20t（每 interval 一次）／ 收 fade 0–24t。
 * 范围：cloud 与 draw 的圆盘半径直接绑 `data.radius`（服务端算出的粉尘半径），画面画到哪云就罩到哪。
 * 运动：粉尘缓慢外扩、向内一收、贴着地面打转。
 * 数：粉尘颗粒数绑 `data.motes`（特攻派生），被吸住的敌人数由 `data.lured` 提高强度。
 * 说明：持续状态故意有些遮挡，视线让给「云里」这个机制本身；密度刻意压低，玩家仍看得清目标和战场。
 */
const RagePowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "shake", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 10, interval: 3 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xC8D97A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xEEF3C8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        cloud: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "haze", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 26, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "up", speed: [0.004, 0.02], spin: 4,
                    lifetime: [18, 32], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xC8D97A, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 110
                },
                {
                    name: "floor", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 4, shape: { kind: "circle", radius: { data: "radius", fallback: 1 }, thickness: 0.85 },
                    direction: "outward", speed: [0.006, 0.022],
                    lifetime: [18, 30], size: [0.16, 0.04],
                    color: 0x6E7A3A, alpha: [0.3, 0.02], alphaMode: "sin", light: "world", maxParticles: 24
                },
                {
                    name: "motes", bind: "target", offset: [0, 0.35, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.006, 0.024], spin: 8,
                    lifetime: [14, 26], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xEEF3C8, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 70
                }
            ]
        },
        draw: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "suck", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 3, interval: 3 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1 }, thickness: 0.95 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xC8D97A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "puff", bind: "target", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x6E7A3A, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "down", speed: [0.01, 0.05], gravity: 0.01, drag: 0.96,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0x6E7A3A, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "last_puff", bind: "target", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06], drag: 0.93,
                    lifetime: [14, 24], size: [0.12, 0.03],
                    color: 0xC8D97A, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ragepowder", 1, RagePowderDefinition);
