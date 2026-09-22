/**
 * 跃起 / splash 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者压低身子，然后一蹦——水花沿一条低矮的抛物线拖着尾巴，落地时在脚边溅开一小圈。
 * 色相家族：水蓝与近白（giantsplash / fishsplash / rainsplash / water_ripple）为主体，灰白尘点只做落地衬托。
 * 拍子：起（crouch 蹲身蓄力）→ 蹦（hop 沿抛物线拖尾）→ 落（land 溅开）。
 * 范围：这一招只作用于自己，画面就是它本人这一跳；hop 绑住施法者，trail 沿实际轨迹撒点，玩家看到的就是它走过的路。
 * 运动：hop 的粒子带重力、沿跳跃轨迹自然下坠；落地时水花向外、向上溅开再落下。
 * 数：水花量按服务端 `data.motes`（等级与体重派生）派生，跳得高（`data.height`）时尾迹更长更亮。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SplashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "crouch_pool", bind: "source", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 10, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.24, 0.1], sizeMode: "linear",
                    color: 0x9FD4FF, alpha: [0.4, 0], light: "world", maxParticles: 20
                },
                {
                    name: "crouch_dust", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "circle", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC8C8C0, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        hop: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "hop_trail", bind: "source", height: 0.25, fit: "none",
                    trail: { minDistance: 0.12 },
                    particle: "world_combat_core:cobblemon/generic/water/fishsplash",
                    rate: 40, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.12], spread: 30,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xBFE4FF, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "hop_drops", bind: "source", height: 0.3, fit: "none",
                    trail: { minDistance: 0.2 },
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 22, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.14], spread: 40,
                    gravity: 0.05, drag: 0.99,
                    lifetime: [12, 20], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xE8F4FF, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        land: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "land_splash", bind: "source", height: 0.08, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "motes", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.28], spread: 40,
                    gravity: 0.05, drag: 0.97,
                    lifetime: [10, 20], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xCFE9FF, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "land_ring", bind: "source", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 18], size: [0.4, 0.9], sizeMode: "linear",
                    color: 0x9FD4FF, alpha: [0.5, 0], light: "world", maxParticles: 10
                },
                {
                    name: "land_dust", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xC8C8C0, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_splash", 1, SplashDefinition);
