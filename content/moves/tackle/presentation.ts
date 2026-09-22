/**
 * 撞击 / tackle 的客户端表现。
 *
 * 一句话：踏起一小段助跑、脚边一路扬尘，撞实的一刻在接触点炸开一团钝白冲击，然后顺着势头从对方身侧
 * 滑过去，在地上留下一道刹车尘。
 * 色相家族：暖土棕（earth / tinydust）与近白钝击（impact_normal）为主，速度线是浅米色，没有饱和色。
 * 拍子：起（windup 压低）→ 行（run 助跑）→ 击（impact）→ 收（slip 滑出 / miss 冲空）。
 * 范围：impact 绑命中点，画出的就是撞中的位置；run 的尘迹沿施法者实际走过的轨迹铺开。
 * 运动：起跑时脚下掀起一圈土块，途中速度线沿历史拖尾，命中是短促的外爆，滑出是贴地的刹车尘。
 * 数：`data.stride`（助跑距离 / 0.8，取整）决定起跑掀起的土块数，`data.intensity`（本击威力 / 62）由引擎
 * 放大冲击的亮度与密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const TackleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 48
                }
            ]
        },
        run: {
            duration: 46,
            exit: { stop: 34, drain: 14 },
            emitters: [
                {
                    name: "launch_clods", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 16], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.65, 0], light: "world", maxParticles: 120
                },
                {
                    name: "dust_trail", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, trail: { minDistance: 0.32 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 14], size: [0.09, 0.02],
                    color: 0xBFA377, alpha: [0.55, 0], light: "world", maxParticles: 160
                },
                {
                    name: "rush_lines", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.3, 0.5, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xEADDC0, alpha: [0.45, 0], light: "full", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "scuff", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xC7A97B, alpha: [0.7, 0], light: "world", maxParticles: 110
                }
            ]
        },
        slip: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "brake", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "brake", fallback: 6 }, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "overrun", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tackle", 1, TackleDefinition);
