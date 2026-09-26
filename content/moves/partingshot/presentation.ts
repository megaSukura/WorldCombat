/**
 * 抛下狠话 / partingshot 的客户端表现。
 *
 * 一句话：施法者嘴边聚起一缕暗紫话音 → 一句带刺的狠话（暗紫惊叹镖）沿机制弹道直线飞向瞄准点 → 首碰真实对手时
 *   对手身上炸开暗紫的羞辱色、两枚下压符号压下去，施法者沿实际脚步向反方向拖出一条退线走开；有后备时在同一点
 *   亮起一圈交接光换手。话撞在墙上或擦过友方时只在碰点冒一小撮哑掉的灰烟，不画下压符号。
 * 色相家族：暗紫 0x6A3FA0 画主线，近白紫 0xD9C2F0 只给「扎中」那一下，暗酒红 0x3A2140 作余韵，交接光近白 0xEDE3FF。
 * 起击收：起 barb 10t ／ 飞 launch 沿机制轨迹 ／ 击 drain 26t ／ 退 step 沿 data.path ／ 换 switch 24t ／ 空 whiff 18t。
 * 范围：本招是一条「施法者→瞄准点」的线；投射物本体（`sprite` 惊叹镖）就是那句话说走的路，玩家一眼看出打向哪。
 * 运动：镖沿机制弹道直线飞行；drain 的暗色从对手身上向内压、余韵向下沉；step 的退线直接读 `data.path`（实际脚步顶点）。
 * 数：launch／drain 的粒子数量直接读本招算出的 `motes`（特攻派生），drain 的暗色爆发读 `drop`（实际削掉的等级数，
 *   被拒绝时为 0 且不出现），强度读 `intensity`（削得越多越重）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * barb   起始  thought_trail_small 向内收    0.07-0.01 8-14 0.5→0 ≤40
 * launch 强调  impact_dark         球面向外  0.24-0.05 8-14 0.8→0 ≤32
 * launch 细节  glowingsparkle      向外散    0.06-0.01 8-12 0.7→0 ≤40
 * drain  强调  impact_dark         球面向内  0.40-0.06 10-16 0.9→0 ≤40
 * drain  主体  obscuringsmoke      球向外沉  0.30-0.10 12-20 0.5→0 ≤30
 * whiff  空响  smoke               原地一小撮 0.14-0.05 8-14 0.4→0 ≤16
 * block  墙阻  impact_dark         沿碰点散  0.30-0.06 8-14 0.6→0 ≤20
 * step   退步  quickattack_dashlines 沿 data.path 0.5-0.1 6-10 0.6→0 ≤24
 * switch 交接  mediumring          竖向外扩  1.0-0.3 16-24 0.7→0 ≤24
 * switch 交接  glowingsparkle      向人收    0.06-0.01 10-16 0.8→0 ≤24
 */
const PartingShotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        barb: {
            duration: 10,
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "hiss", bind: "source", offset: [0, 0.55, 0.25], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: 18, shape: { kind: "sphere", radius: 0.25 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xD9C2F0, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        launch: {
            duration: 18,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "shot", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x6A3FA0, alpha: [0.8, 0], light: "full", maxParticles: 32
                },
                {
                    name: "fleck", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 26, shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.12],
                    lifetime: [8, 12], size: [0.06, 0.01],
                    color: 0xD9C2F0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        drain: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sting", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "drop", fallback: 1 }, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.40, 0.06], sizeMode: "index",
                    color: 0xD9C2F0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "sink", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 18, shape: { kind: "sphere", radius: 0.35 }, direction: "down", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [12, 20], size: [0.30, 0.10], sizeMode: "index",
                    color: 0x3A2140, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lost", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.05],
                    color: 0x3A2140, alpha: [0.4, 0], light: "world", maxParticles: 16
                },
                {
                    name: "blocked", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "blocked", fallback: 0 } }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.15], drag: 0.9,
                    lifetime: [8, 14], size: [0.30, 0.06], sizeMode: "index",
                    color: 0x3A2140, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        step: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "back", bind: "path", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.15],
                    rate: 30,
                    lifetime: [6, 10], size: [0.5, 0.1], sizeMode: "index",
                    color: 0x6A3FA0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        switch: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "handoff", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 1 }, shape: { kind: "ring", radius: 0.7, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.1],
                    lifetime: [16, 24], size: [1.0, 0.3], sizeMode: "index",
                    color: 0xEDE3FF, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "ready", bind: "point", fit: "none", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 }, direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xD9C2F0, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_partingshot", 1, PartingShotDefinition);
