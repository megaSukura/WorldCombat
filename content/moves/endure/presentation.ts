/**
 * 挺住的客户端表现。
 *
 * 一句话：贴身的暗红呼吸纹随心跳一收一放，致命一击落下的一瞬从身体炸开一圈橙白闪光与一颗 1 HP 脉冲，
 * 同时亮出还剩下几次保命，随后纹路迅速熄灭。
 * 色相家族：暗红与橙（warblingring / impact_fighting / fadeheart_white / ember 系），闪光只用同族亮白强调。
 * 拍子：起（brace 0–10t，贴身纹随呼吸收放）→ 击（save 只在真截住致命击时爆闪）→ 收（spent 迅速熄灭）。
 * 范围：brace 是随身体缩放的贴身呼吸纹（fit:"body"），不再铺一圈地面大纹，玩家看到贴身纹在就知道这段时间打得死你。
 * 运动：呼吸纹缓慢脉动；保命时冲击向外炸开并带上扬光点，负值重力让它们回落后消散。
 * 数：`data.lethalCount`（被截断伤害／最大生命的 30 倍）是保命爆点数量，`data.intensity`（剩余次数／初始次数）缩放呼吸纹密度，
 * `data.charges`（还剩几次保命）就是 1 HP 贴身脉的数量。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EndureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "breath_line", bind: "source", offset: [0, 0.55, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 7, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [22, 38], size: [0.4, 0.4], sizeMode: "sin",
                    color: 0xB03024, alpha: [0.38, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 22
                },
                {
                    name: "breath_core", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 5, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [20, 32], size: [0.34, 0.34], sizeMode: "sin",
                    color: 0xE07038, alpha: [0.32, 0.1], alphaMode: "sin",
                    light: "full", maxParticles: 16
                },
                {
                    name: "heart", bind: "source", offset: [0, 0.58, 0], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 22], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFF9A6A, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        save: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 16, at: 1 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 15], size: [0.36, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "one_hp", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14, at: 0 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.4, 0.1],
                    color: 0xFFF2D8, alpha: [0.95, 0], light: "full", bloom: 0.5
                },
                {
                    name: "burst", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "lethalCount", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFD9A8, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "lifeline", bind: "target", offset: [0, 0.92, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: { data: "charges", fallback: 1 } }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [16, 24], size: [0.15, 0.15],
                    color: 0xFFE0C0, alpha: [1, 0], light: "full"
                },
                {
                    name: "rise", bind: "target", offset: [0, 0.3, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [14, 26], size: [0.08, 0.01],
                    color: 0xFFB06A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        spent: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.4, 0.08],
                    color: 0x8A4A44, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "breath", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.22, 0.06],
                    color: 0x6A4A48, alpha: [0.25, 0], gravity: 0.02, light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_endure", 1, EndureDefinition);
