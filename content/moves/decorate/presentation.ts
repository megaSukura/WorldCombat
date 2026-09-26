/**
 * 装饰 / decorate 的客户端表现。
 *
 * 一句话：施法者手边先转起一束奶油与缎带 → 这束装饰作为真实投射物沿两人的连线飞过去，一路撒着细碎的光 →
 * 落到队友身上炸开，纸屑与星星绕着他转起来；之后一小段时间，装饰还亮着、偶尔闪一下。被墙或别的身体挡下、或飞空时，缎带在半路散落。
 * 色相家族：奶油 0xFFF3D6 与粉 0xFF9FC4 为主体，金色 0xFFD36A 只做强调层的星点。
 * 拍子：起（gather 0–12t）→ 飞（flight 绑真实 projectile，飞多久就画多久）→ 中（adorn 0–30t）→ 收（glint 低密度续期）；
 *   落空时转 scatter 在半路散开。
 * 范围：flight 绑投射物本体的实时位置（`data.projectile`），画的不是一条预告线，而是缎带真正飞过的轨迹；
 *   adorn 绑目标，落在谁身上一眼可见。散射点由服务端按真实命中/方块面给出。
 * 运动：装饰从手边送出、沿投射物实际轨迹飞行、到达才在目标身上炸开并绕身上浮；落空则在接触点散落。
 * 数：件数绑 `data.trinkets`（特攻派生），送达规模绑 `data.scale`（施法者体型派生），
 *   到达强度由服务端在 `gift` 级数上体现。
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
        flight: {
            duration: 44,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ribbon", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    rate: { data: "trinkets", fallback: 8 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.02, 0.1], spread: 40, spin: 80,
                    drag: 0.96,
                    lifetime: [10, 18], size: [0.13, 0.03],
                    color: 0xFFC8DE, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ribbon_glow", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "trinkets", fallback: 8 }, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFF3D6, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "star_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 6, shape: { kind: "sphere", radius: 0.15 },
                    direction: "shape", speed: [0.03, 0.12], spread: 12,
                    lifetime: [6, 12], size: [0.13, 0.04], sizeMode: "sin",
                    color: 0xFFD36A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 50
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
        scatter: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spill", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "trinkets", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.92, spin: 60,
                    lifetime: [12, 22], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFF3D6, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "fade", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFFC8DE, alpha: [0.5, 0], light: "full", maxParticles: 24
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
