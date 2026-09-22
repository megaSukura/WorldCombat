/**
 * 挺住的客户端表现。
 *
 * 一句话：脚下一圈暗红的坚持纹随心跳一收一放，致命一击落下的一瞬从身体炸开一圈橙白闪光与上升的光点，随后纹路散去。
 * 色相家族：暗红与橙（warblingring / impact_fighting / fadeheart_white / flame 系），闪光只用同族亮白强调。
 * 拍子：起（brace 0–10t，地纹自脚边铺开）→ 击（save 爆闪）→ 收（spent 淡去）。
 * 范围：brace 是以自身脚下约 1.2 格为半径的地纹（不随体型放大），玩家看到纹在就知道这段时间打不死。
 * 运动：地纹缓慢脉动；保命时冲击向外炸开并带上扬光点，负值重力让它们回落后消散。
 * 数：`data.lethalCount`（被截断伤害／最大生命的 30 倍）就是保命爆点的数量，`data.intensity`（剩余次数／初始次数）决定坚持纹亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EndureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "ground_ring", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 8, shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [26, 44], size: [0.55, 0.55], sizeMode: "sin",
                    color: 0xB03024, alpha: [0.35, 0.1], alphaMode: "sin",
                    light: "world", maxParticles: 20
                },
                {
                    name: "core", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 6, shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [20, 34], size: [0.45, 0.45], sizeMode: "sin",
                    color: 0xE07038, alpha: [0.3, 0.08], alphaMode: "sin",
                    light: "full", maxParticles: 16
                },
                {
                    name: "heart", bind: "source", offset: [0, 0.55, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 24], size: [0.13, 0.03], sizeMode: "sin",
                    color: 0xFF9A6A, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        save: {
            duration: 28,
            exit: { stop: 14, drain: 22 },
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
                    name: "burst", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "lethalCount", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFD9A8, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "rise", bind: "target", offset: [0, 0.3, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [14, 26], size: [0.08, 0.01],
                    color: 0xFFB06A, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "shock_ring", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [12, 20], size: [0.5, 0.1],
                    color: 0xE07038, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        spent: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.4, 0.08],
                    color: 0x8A4A44, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "breath", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0x6A4A48, alpha: [0.25, 0], gravity: 0.02, light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_endure", 1, EndureDefinition);
