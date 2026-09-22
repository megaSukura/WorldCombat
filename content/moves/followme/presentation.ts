/**
 * 看我嘛 / Follow Me 的粒子语言。
 *
 * 一句话：抬手把掌心的一撮光拢起来（windup）→ 一圈招呼波从脚下向外扩到喊话半径、心形与光点向上迸开（call）→
 *   注意被拉住的这段时间里，身周浮着淡淡心光、随节奏轻轻脉动（held）→ 时间到了，心光慢慢升散（fade）。
 * 色相家族：暖粉 0xFF9ECF 为主体，近白 0xFFF0F6 做高光，暖黄 0xFFE08A 只做强调。
 * 拍子：起 windup 0–12t ／ 呼 call 0–24t（每 interval 一次）／ 持 held ／ 收 fade 0–24t。
 * 范围：call 的招呼波沿 `data.wave`（服务端按喊话半径算出的每刻速度）正好走到喊话半径，站在这圈外就不会被拉住。
 * 运动：招呼波自脚下向外、心形与光点向上、被拉住的注意从四周向身体聚拢。
 * 数：迸出的心形与光点数绑 `data.motes`（特攻派生），被拉住的敌人数由 `data.lured` 提高强度。
 */
const FollowMeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [7, 12], size: [0.09, 0.02],
                    color: 0xFFF0F6, alpha: [0.8, 0], light: "full", maxParticles: 36
                },
                {
                    name: "hand", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFF9ECF, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        call: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wave", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 3 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: { data: "wave", fallback: 0.25 },
                    lifetime: [16, 20], size: [0.3, 0.62], sizeMode: "sin",
                    color: 0xFF9ECF, alpha: [0.75, 0], light: "full", maxParticles: 24
                },
                {
                    name: "hearts", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xFFF0F6, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "attention", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 26, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFE08A, alpha: [0.85, 0], light: "full", maxParticles: 50
                }
            ]
        },
        held: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "aura", bind: "target", offset: [0, 0.3, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.006, 0.025], spin: 10,
                    lifetime: [16, 28], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFF9ECF, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 44
                },
                {
                    name: "crown", bind: "target", offset: [0, 1.0, 0], height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.004, 0.016],
                    lifetime: [16, 26], size: [0.24, 0.48], sizeMode: "sin",
                    color: 0xFFE08A, alpha: [0.35, 0], light: "full", maxParticles: 14
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "drift", bind: "target", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 12, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [16, 28], size: [0.13, 0.02],
                    color: 0xFF9ECF, alpha: [0.45, 0], light: "world", maxParticles: 30
                },
                {
                    name: "last_call", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [14, 24], size: [0.28, 0.6], sizeMode: "sin",
                    color: 0xFFE08A, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_followme", 1, FollowMeDefinition);
