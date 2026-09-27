/**
 * 龙之舞 / dragondance 的客户端表现。
 *
 * 一句话：脚下先盘起一圈暗紫的龙气 → 舞者沿圆周一圈比一圈高地连续盘行，龙气沿真实足点拖成上升的螺旋 →
 * 收势时龙气向外炸开，真正落地才荡出地环。色相家族：龙紫 0x8A6CFF 为主体，靛青 0x4A3A8C 作脚下与余韵，暖白 0xE8DEFF 只落在强调层。
 * 拍子：起（coil 0–14t）→ 盘（rise 每刻一小段，服务端按真实刻进度逐步发）→ 收（settle 0–30t）→ 尾（fade）→ 势（airy 持续）。
 * 范围：settle 的地环绑脚点、fit none，半径绑 `data.gyre`（实际螺旋半径），画出的圈就是龙气扫到的范围。
 * 运动：coil 龙气向脚边收拢；rise 不画固定速度的假螺旋——服务端每刻把当前真实身体位置发来，逐步扫过就是身体走过的螺旋；
 *   顶棚压住时（`data.flat`）多一圈被压扁的横环，螺旋不再上升。
 * 数：龙气数量绑 `data.drakes`（物攻与速度之和派生），盘旋圈数绑 `data.turns`、当前第几步绑 `data.step`，
 *   「高飞」时多一层向上的强调；越强的个体画面里的龙气越密。
 * 持续：airy 是绑在真正龙势窗口上的光环（服务端 `WorldFeedback.onEffect` 挂在那层 boostWindow 上），
 *   随窗口自然到期或提前清除一起收，不额外占动作寿命。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "coil_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 12, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.13],
                    lifetime: [9, 16], size: [0.36, 0.1],
                    color: 0x8A6CFF, alpha: [0.5, 0], light: "full", maxParticles: 34
                },
                {
                    name: "coil_mote", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xB49CFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        rise: {
            // 逐步扫过：服务端每刻在当前真实身体位置发一小段，画出的就是身体真正走过的螺旋，不是整段随机。
            duration: 16,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "trail", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "riseMotes", fallback: 3 } },
                    shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.95,
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xA88CFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "dragon_wisp", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: { data: "riseMotes", fallback: 2 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.95,
                    lifetime: [12, 20], size: [0.26, 0.08],
                    color: 0x4A3A8C, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "soar_spark", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "soar", fallback: 0 } },
                    shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xE8DEFF, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    name: "ceiling_press", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "flat", fallback: 0 } },
                    shape: { kind: "ring", radius: { data: "gyre", fallback: 0.7 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0x8A6CFF, alpha: [0.45, 0], light: "world", maxParticles: 20
                }
            ]
        },
        settle: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    // 只有真实踩在地面（服务端给出落地回执）时才荡开地环；空中收势不假装落地。
                    name: "blast_ring", bind: "point", fit: "none", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "ring", fallback: 0 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "gyre", fallback: 0.7 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [14, 22], size: [0.5, 1.0], sizeMode: "index",
                    color: 0x8A6CFF, alpha: [0.75, 0], light: "full", maxParticles: 30
                },
                {
                    name: "dragon_core", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "drakes", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8DEFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 150
                },
                {
                    name: "settle_haze", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [18, 30], size: [0.22, 0.05],
                    color: 0x4A3A8C, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        },
        airy: {
            duration: 0,
            exit: { drain: 20 },
            emitters: [
                {
                    name: "airy_coil", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "ring", radius: { data: "gyre", fallback: 0.7 } },
                    direction: "outward", speed: [0.005, 0.02], spin: 8,
                    lifetime: [14, 24], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x8A6CFF, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "airy_wisp", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 5, shape: { kind: "sphere", radius: { data: "gyre", fallback: 0.7 } },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0x4A3A8C, alpha: [0.25, 0], light: "world", maxParticles: 36
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_mote", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.02, 0.06],
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0x4A3A8C, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragondance", 1, DragonDanceDefinition);
