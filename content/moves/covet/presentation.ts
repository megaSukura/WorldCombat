/**
 * 渴望 / covet 的客户端表现。
 *
 * 一句话：施法者头顶飘起心形、指尖聚起粉色微光，缓缓蹭近时拖一条贴地粉痕；贴上的一刻在目标身上炸开一蓬
 * 心形与粉光（攻势被这份可爱分掉），若得手，那件道具带贴图沿一条归巢弧线飞回施法者、指尖闪一点金色。
 * 色相家族：粉（infatuation_heart / glowingsparkle_pink）为主，近白细节（smallsparkle / tinydust）作衬，
 * 金色（glowingsparkle_yellow）只在“得手”那一小处出现。
 * 拍子：起（whisper 撒娇）→ 贴（approach 蹭近）→ 击（charm 心神被分）→ 得（steal 归巢弧）／空（flop 收势）。
 * 范围：approach 的粉痕沿施法者实际蹭过的轨迹铺开；charm 绑目标，画出的就是被贴上的人。
 * 运动：撒娇时心形向上飘、指尖粉光向内聚；蹭近拖一条贴地粉痕；贴上是心形外散加一圈脚边粉环；道具走归巢弧线。
 * 数：`data.hearts`（亲密度与速度派生的心形数）驱动撒娇与得手的心形量；`data.soft`（降攻级数）放大 charm 的心形与亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CovetDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        whisper: {
            duration: 30,
            exit: { stop: 18, drain: 14 },
            emitters: [
                {
                    name: "flutter", bind: "source", offset: [0, 0.1, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: { data: "hearts", fallback: 6 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xF7A6C8, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 18, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFC4DE, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.75, 0.3], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 3, interval: 5, repeats: 3 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        approach: {
            duration: 26,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "ribbon", bind: "source", offset: [0, 0.05, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 44, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.08, 0.01],
                    color: 0xF7A6C8, alpha: [0.75, 0], light: "full", maxParticles: 70
                },
                {
                    name: "drift", bind: "source", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 9, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xFFC4DE, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charm: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "befuddle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 8 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.02, spin: 8,
                    lifetime: [10, 22], size: [0.13, 0.02],
                    color: 0xF7A6C8, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "softlight", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 8 }, amount: { data: "soft", fallback: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xFFB8D8, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.4, 0.14],
                    color: 0xF7A6C8, alpha: [0.6, 0], light: "full", maxParticles: 4
                }
            ]
        },
        steal: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "pluck", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "hearts", fallback: 8 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0xE48FB5, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "homebound", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 40, shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0xF0D27A, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "acquired", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6, at: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        flop: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0xD8A8BE, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "lastheart", bind: "point", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 2, at: 4 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xF7C6DA, alpha: [0.5, 0], light: "full", maxParticles: 6
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_covet", 1, CovetDefinition);
