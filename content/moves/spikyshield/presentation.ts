/**
 * 尖刺防守的客户端表现。
 *
 * 一句话：一圈藤刺从脚下炸开围住自己，来击在刺环上炸开绿色冲击，撞上来的攻击者被一丛长刺从接触点扎出、当场掉血；
 * 变化招式被刺甲抖开，量尽时藤刺倒下散成一地草屑。
 * 色相家族：草绿为主体（razorleaf／leaf／impact_grass），刺尖偏黄绿强调；烟尘层低饱和中性。
 * 拍子：起（raise 0–16t，藤刺自下而上顶出并扬草屑）→ 击（block 每次拦截、punish 每次穿刺）→ 收（fall 倒下散开）。
 * 范围：hold 的刺环按 `data.scale`（藤刺半径／1.6）铺开——画面就是被判定的那一圈。
 * 运动：起手藤刺向上顶出；持甲几乎静止，只在被撞击处向内一震；穿刺时从接触点朝攻击者射出一丛长刺。
 * 数：`data.piercing`（刺伤威力取整）就是 punish 长刺的根数，`data.intensity`（剩余量／初始量）决定亮度，`data.scale` 放大刺环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SpikyShieldDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 16,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "thorns", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 34, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [10, 20], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x5EA83C, alpha: [0.9, 0], gravity: 0.03, drag: 0.92,
                    light: "world", maxParticles: 120
                },
                {
                    name: "blades", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: 24, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.24], spin: 24,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x7CC24E, alpha: [0.9, 0], gravity: 0.05, drag: 0.9,
                    light: "world", maxParticles: 90
                },
                {
                    name: "leafdust", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.12], spin: 40,
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xA7D07A, alpha: [0.6, 0], gravity: 0.04, light: "world", maxParticles: 70
                }
            ]
        },
        hold: {
            // 持续状态：低密度草绿刺环贴在脚边，让玩家看清目标与范围。
            emitters: [
                {
                    name: "stake_ring", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    rate: 7, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.0, 0.01], spin: 4,
                    lifetime: [26, 44], size: [0.2, 0.2], sizeMode: "sin",
                    color: 0x4F9A34, alpha: [0.4, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 26
                },
                {
                    name: "base_ring", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [24, 38], size: [0.5, 0.5], sizeMode: "sin",
                    color: 0x3F7A2E, alpha: [0.2, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 12
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 12, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "shock", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 },
                    shape: { kind: "arc", radius: 0.7, arcDegrees: 150 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.34, 0.1],
                    color: 0x9BD77A, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "leaves", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: 20 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.07, 0.24], spin: 30,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x86C95A, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        punish: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "pierce", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "piercing", fallback: 10 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 24 },
                    direction: "shape", speed: [0.14, 0.36], spin: 22,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xC9E24A, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "wound", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "sparks", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 28, gravity: 0.05,
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xE7F27A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        deflect: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "ward", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.5, 0.1],
                    color: 0x7CC24E, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "shake", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: 18 },
                    shape: { kind: "arc", radius: 0.6, arcDegrees: 130 },
                    direction: "outward", speed: [0.1, 0.28], spin: 32,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xA7D07A, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "collapse", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 32 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.05, 0.2], spin: 30,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [14, 26], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x4F7A3C, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "falling", bind: "target", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], spin: 40,
                    lifetime: [18, 32], size: [0.16, 0.04],
                    color: 0x8FBF63, alpha: [0.6, 0], gravity: 0.05, light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.13],
                    lifetime: [16, 30], size: [0.3, 0.08],
                    color: 0x7A7F66, alpha: [0.3, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spikyshield", 1, SpikyShieldDefinition);
