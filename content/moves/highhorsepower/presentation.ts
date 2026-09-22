/**
 * 十万马力 / highhorsepower 的客户端表现。
 *
 * 一句话：施法者压低整个身体、四足蹬地，随后贴着地面冲出去，身下拖出一条平行的尘带；撞上的瞬间整个撞面
 * 炸开一圈低矮的尘环、翻起土块，目标被顶开——撞击点的尘量按这次冲撞算出的「马力」走。
 * 色相家族：土黄与赭褐（earth／tinydust／large_rock／groundquake／impact_ground）＋白亮冲击核心。
 * 拍子：起（ready 压低扬尘）→ 冲（drive 贴地尘带与速度线）→ 击（impact 尘环与土块）→ 压（press，仅压身式）
 *   ／失（miss）。
 * 范围：impact 的尘环半径用 `data.scale`（踏地判定 / 0.45）铺开，画出来的就是正面撞面的宽度。
 * 运动：`drive` 的 trail 沿施法者实际冲过的路线铺开，画面即那条冲刺走廊；命中时土块向外抛、落地沉下。
 * 数：`impact`／`miss` 的粒子量绑 `data.dust`（物攻与体重换算出机制数），核心强度绑 `data.intensity`（实际威力派生）；
 *   `data.progress` 让冲程中的尘量随前进变密。
 */
const HighhorsepowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        ready: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "brace_dust", bind: "source", offset: [0, 0.06, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.09, 0.03], color: 0x9A8258, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "brace_earth", bind: "source", offset: [0, 0.35, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.4 }, direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.13, 0.03], color: 0x8A744C, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drive: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "body_dust", bind: "source", offset: [0, 0.3, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "dust", fallback: 16 }, shape: { kind: "ring", radius: 0.4 }, direction: "outward",
                    speed: [0.05, 0.16], gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.16, 0.04], color: 0x8A744C, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "skid_trail", bind: "source", offset: [0, 0.2, 0], height: 0.25,
                    trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [8, 14], size: [0.1, 0.02], color: 0x9A8258, alpha: [0.5, 0], light: "world", maxParticles: 140
                },
                {
                    name: "speed_lines", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 18, shape: { kind: "line", length: 0.9, rotation: [0, 0, 90] }, direction: "shape",
                    speed: [0.02, 0.08],
                    lifetime: [4, 8], size: [0.32, 0.06], color: 0xE8D8B0, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slam", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "dust", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.28], spread: 24,
                    lifetime: [7, 13], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 110
                },
                {
                    name: "clods", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.1, 0.34], spread: 22,
                    gravity: 0.12, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x7E6B48, alpha: [0.75, 0], light: "world", maxParticles: 60
                },
                {
                    name: "wave", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [10, 16], size: [0.5, 1.1], color: 0xC7B183, alpha: [0.55, 0], light: "world", maxParticles: 4
                },
                {
                    name: "might_spark", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.06, 0.22], spread: 24,
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE9B0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        press: {
            duration: 26,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "press_ring", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 }, shape: { kind: "point" }, direction: "up", speed: [0, 0],
                    lifetime: [10, 16], size: [0.62, 1.3], color: 0xB89A6A, alpha: [0.5, 0], light: "world", maxParticles: 3
                },
                {
                    name: "press_dust", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "ring", radius: 0.7 }, direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.09, 0.02], color: 0x8E8064, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], gravity: 0.08,
                    lifetime: [10, 16], size: [0.06, 0.02], color: 0x9A8C6C, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_highhorsepower", 1, HighhorsepowerDefinition);
