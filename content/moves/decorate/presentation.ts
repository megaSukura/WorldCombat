/**
 * 装饰 / decorate 的客户端表现。
 *
 * 一句话：施法者手边先转起一束奶油与缎带 → 这束装饰沿着两人的连线飞过去，一路撒着细碎的光 →
 * 落到队友身上炸开，纸屑与星星绕着他转起来；之后一小段时间，装饰还亮着、偶尔闪一下。
 * 色相家族：奶油 0xFFF3D6 与粉 0xFF9FC4 为主体，金色 0xFFD36A 只做强调层的星点。
 * 拍子：起（gather 0–12t）→ 飞（stream 0–26t）→ 中（adorn 0–30t）→ 收（glint 低密度续期）。
 * 范围：stream 绑 `data.path`（施法者 ↔ 目标的实体顶点，两人走位时这条线跟着走），画的就是装饰飞过的轨迹；
 *   adorn 绑目标，落在谁身上一眼可见。
 * 运动：装饰向外送出、沿连线飞行、落到目标身上炸开并绕身上浮。
 * 数：件数绑 `data.trinkets`（特攻派生），命中强弱绑 `data.intensity`（提升级数派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DecorateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "twirl", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: 12, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.1], spin: 40,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xFFF3D6, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "hand_glow", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "ring", radius: 0.38 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xFF9FC4, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        stream: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ribbon", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" },
                    rate: { data: "trinkets", fallback: 8 }, direction: "shape", speed: [0.03, 0.12], spread: 10,
                    lifetime: [7, 14], size: [0.13, 0.03],
                    color: 0xFFC8DE, alpha: [0.85, 0], light: "full", maxParticles: 140
                },
                {
                    name: "confetti_trail", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    shape: { kind: "polyline" },
                    rate: { data: "trinkets", fallback: 8 }, direction: "shape", speed: [0.02, 0.1], spread: 20, spin: 60,
                    gravity: 0.01, drag: 0.95,
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0xFFF3D6, alpha: [0.7, 0], light: "world", maxParticles: 110
                },
                {
                    name: "star_trail", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/star",
                    shape: { kind: "polyline" },
                    rate: 6, direction: "shape", speed: [0.04, 0.14], spread: 12,
                    lifetime: [6, 12], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xFFD36A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        adorn: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "pop", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "trinkets", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.02, drag: 0.93, spin: 80,
                    lifetime: [12, 22], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFF3D6, alpha: [0.9, 0], light: "world", maxParticles: 110
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFD36A, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "hearts_up", bind: "target", offset: [0, 0.7, 0], height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 6, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFF9FC4, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        glint: {
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "keep_shine", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "trinkets", fallback: 8 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [12, 22], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xFFD9E8, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "keep_star", bind: "target", offset: [0, 0.62, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 4, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.003, 0.015],
                    lifetime: [14, 24], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xFFD36A, alpha: [0.35, 0], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_decorate", 1, DecorateDefinition);
