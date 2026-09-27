/**
 * 吸取之吻 / drainingkiss 的客户端表现。
 *
 * 一句话：施法者唇边亮起粉光 → 两枚心从两具身体的最近面逐渐合到一起，贴住之后一口吸回，
 * 对方身上炸开一圈心与妖精冲击，一串玫红光点沿「对方→自身」被吸回来，落到施法者身上化成回血的粉白光。
 * 中途松口只碎开几点心，亲空散开一小把白心。
 *
 * 色相家族：玫瑰粉（0xFF8FB8）与深玫（0xE0508A）为主体，粉白（0xFFD0E4）只做吸取核心与回血层；
 *   与天使之吻（混乱状态）同色相但运动相反：这里是**心被吸回施法者**，那里是目标头顶久久打转的心与鸟。
 * 拍子：起 lean（凑近）→ 抱 embrace（两心沿真实接触段合拢，自定义场景绘制）→ 吻 kiss（心爆＋妖精冲击＋吸取束）
 *       ＋汲 mend（施法者回血）／松 slip（碎心）／空 miss（散心）。
 * 范围：embrace 的 from/to 就是两体的真实最近面；kiss 的吸取束长度读 `data.span`（目标到施法者的真实距离），
 *   方向读 `data.direction`，画的就是这一吻够到的线。
 * 数：`data.hearts`（特攻与亲密度换算）决定爆开的心数与合拢的密度，`data.heal`（实际补回的生命）决定回血量感。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DrainingkissDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lean: {
            duration: 10,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "pucker", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 12, shape: { kind: "circle", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.06], spin: 24,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFF8FB8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 24
                },
                {
                    name: "warm", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 4, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xFFD0E4, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        kiss: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hearts", bind: "point", height: 0.7, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.94,
                    lifetime: [14, 24], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "fairy", bind: "point", height: 0.65, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 13], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 34
                },
                {
                    name: "drain", bind: "point", orient: "direction", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "line", length: { data: "span", fallback: 1 } },
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
                    burst: { count: { data: "heal", fallback: 14 } }, shape: { kind: "sphere_surface", radius: 0.42 },
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
        slip: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "broken", bind: "point", height: 0.7, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0xE0508A, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", height: 0.7, fit: "none",
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

/**
 * 贴触窗的固定图形（自定义客户端场景，不生成粒子或实体）：
 * 服务端每刻给出两具身体的真实最近面 `from`/`to` 与当刻进度 `progress`；这里把两枚心从各自一侧逐渐收拢到接触中点，
 * 并按 `data.hearts` 撒定量的高光点；都复用原生图集贴图，没有粒子生灭或额外实体开销。断开时服务端停掉这个场景。
 */
WorldCombatClient.scene("world_combat:move_drainingkiss_embrace", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "embrace") return;
    const from = Array.isArray(data.from) ? data.from : null;
    const to = Array.isArray(data.to) ? data.to : null;
    if (!from || !to || from.length !== 3 || to.length !== 3) return;
    const progress = Math.max(0, Math.min(1, Number(data.progress) || 0));
    const scale = Math.max(0.4, Math.min(2.2, Number(data.scale) || 1));
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
    const pull = 0.35 + 0.65 * progress;
    const ax = from[0] + (mid[0] - from[0]) * pull, ay = from[1] + (mid[1] - from[1]) * pull, az = from[2] + (mid[2] - from[2]) * pull;
    const bx = to[0] + (mid[0] - to[0]) * pull, by = to[1] + (mid[1] - to[1]) * pull, bz = to[2] + (mid[2] - to[2]) * pull;
    const heartFrame = Math.floor(frame.serverTick() / 2) % 10;
    const pink = ((0xFF << 24) | 0xFF8FB8) | 0;
    const white = ((0xC0 << 24) | 0xFFD0E4) | 0;
    frame.sprite("cobblemon:particle/generic/status/infatuation_heart", ax, ay, az, 0.24 * scale, 0, pink, heartFrame, true);
    frame.sprite("cobblemon:particle/generic/status/infatuation_heart", bx, by, bz, 0.24 * scale, 0, pink, heartFrame, true);
    const motes = Math.max(1, Math.min(6, Math.round((Number(data.hearts) || 6) / 6)));
    for (let i = 0; i < motes; i++) {
        const t = (i + 1) / (motes + 1);
        frame.sprite("cobblemon:particle/generic/sparkle/glowingsparkle_pink",
            mid[0] + (ax - mid[0]) * t, mid[1] + (ay - mid[1]) * t, mid[2] + (az - mid[2]) * t,
            0.1 * scale, 0, white, i % 4, true);
    }
});
