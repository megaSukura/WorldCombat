/**
 * 污泥炸弹 / sludgebomb 的客户端表现。
 *
 * 一句话：施法者把毒泥压进弹壳、点着引信掷出；炸弹沿弧线落到对手脚边，插在地上嗞嗞冒烟、慢慢鼓胀，
 *   引信烧完的一刻炸开一圈毒泥与毒烟，把圈里的人和地一起染绿。
 * 色相家族：污泥绿（moves/sludgebomb / goo/chemicalsplash / ooze）为主体，毒紫（poisonbubble）做小面积毒气，白亮只用炸开那一下。
 * 拍子：起（shell 压弹点引信）→ 落（flight 拖尾、fuse 鼓胀冒烟）→ 炸（burst 圈开、毒烟腾起、淡出）。
 * 范围：fuse 与 burst 的地面圈都按服务端传的 `data.radius`（真实爆心半径）画出，圈就是会被炸到的地。
 * 运动：炸弹沿服务端算好的弧线飞（projectile 绑定尾迹），毒烟向上腾、泥点向外迸。
 * 数：`data.fumes`（特攻派生）决定毒烟与泥点的密度，`data.hits`/`data.intensity`（命中数与威力派生）决定爆开的亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SludgebombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        shell: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "pack", bind: "source", offset: [0, 0.55, 0.35], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "fumes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.07], spread: 24,
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0x6E8C3A, alpha: [0.75, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fizz", bind: "source", offset: [0, 0.75, 0.4], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 8, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xA879D0, alpha: [0.6, 0], light: "full", maxParticles: 14
                }
            ]
        },
        flight: {
            duration: 80,
            exit: { stop: 70, drain: 16 },
            emitters: [
                {
                    name: "trail", bind: "projectile", trail: { minDistance: 0.32 },
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "fumes", fallback: 16 },
                    direction: "down", speed: [0.01, 0.06], spread: 22,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0x6E8C3A, alpha: [0.6, 0], light: "world", maxParticles: 44
                },
                {
                    name: "smoke", bind: "projectile", trail: { minDistance: 0.4 },
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 8, direction: "up", speed: [0.01, 0.04], spread: 20,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xA879D0, alpha: [0.45, 0], light: "full", maxParticles: 26
                }
            ]
        },
        fuse: {
            duration: { data: "fuse", fallback: 22 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "swell", bind: "point", offset: [0, 0.18, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: { data: "fumes", fallback: 16 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.05], spread: 30,
                    lifetime: [8, 16], size: [0.18, 0.05],
                    color: 0x6E8C3A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fuse_smoke", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 14, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.07], spread: 12,
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xA879D0, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "mark", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 6, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.003, 0.02],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x7FB84A, alpha: [0, 0.35], alphaMode: "sin", light: "world", maxParticles: 60
                }
            ]
        },
        burst: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "fumes", fallback: 16 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [12, 24], size: [0.22, 0.03],
                    color: 0x7FB84A, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "cloud", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "fumes", fallback: 16 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.03, 0.12], spread: 20,
                    gravity: -0.01, drag: 0.88,
                    lifetime: [18, 34], size: [0.4, 0.05],
                    color: 0x6E8C3A, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "hits", fallback: 1 }, at: 1 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 13], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 12
                },
                {
                    name: "tox", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: { data: "fumes", fallback: 16 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.04, 0.16], spread: 18,
                    drag: 0.9,
                    lifetime: [14, 28], size: [0.14, 0.02],
                    color: 0xA879D0, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sludgebomb", 1, SludgebombDefinition);
