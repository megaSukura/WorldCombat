/**
 * 吸取之吻 / drainingkiss 的客户端表现。
 *
 * 一句话：施法者唇边亮起粉光 → 贴身送上一吻，在对方身上炸开一圈心与妖精冲击，一串玫红光点沿「对方→自身」
 * 被吸回来，落到施法者身上化成回血的粉白光。亲空时只散开几点心。
 *
 * 色相家族：玫瑰粉（0xFF8FB8）与深玫（0xE0508A）为主体，粉白（0xFFD0E4）只做吸取核心与回血层；
 *   与天使之吻（混乱状态）同色相但运动相反：这里是**心被吸回施法者**，那里是心在目标头顶久久打转。
 * 拍子：起 lean（凑近）→ 吻 kiss（心爆＋妖精冲击＋吸取束）＋ 汲 mend（施法者回血）／空 miss（散心）。
 * 范围：kiss 的吸取束长度读 `data.span`（目标到施法者的真实距离），方向读 `data.direction`，画的就是这一吻够到的线。
 * 运动：心先在目标处爆开，吸取束沿「目标→自身」把玫红光点抽回；mend 在施法者身上向上冒起回血光。
 * 数：`data.hearts`（特攻与亲密度换算）决定爆开的心数与吸取束密度，`data.sap`（回血比例百分比）决定回血量感。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DrainingkissDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lean: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "pucker", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "circle", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.06], spin: 24,
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0xFF8FB8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 26
                },
                {
                    name: "warm", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 5, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xFFD0E4, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        kiss: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hearts", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.94,
                    lifetime: [14, 24], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "fairy", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 13], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "drain", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "hearts", fallback: 12 },
                    direction: "shape", speed: [0.10, 0.30], spread: 10,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xE0508A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 80
                }
            ]
        },
        mend: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "glow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "sap", fallback: 14 } }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [12, 20], size: [0.1, 0.01],
                    color: 0xFFD0E4, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 42
                },
                {
                    name: "ring", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.24, 0.5],
                    color: 0xFF8FB8, alpha: [0.5, 0], light: "full", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drainingkiss", 1, DrainingkissDefinition);
