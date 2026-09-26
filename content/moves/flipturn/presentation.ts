/**
 * 快速折返 / flipturn 的客户端表现。
 *
 * 一句话：施法者身侧先聚起一圈预备的浪 → 贴着一条水线撞上目标、炸开一撮水花与一圈涟漪 →
 *   从接触点起跳、身体和水线一起翻过矮敌，再从它另一侧滑走并在落点炸开一撮水花。
 * 色相家族：水蓝 0x4FB3E8 画主线，浅青白 0x9FE0FF 画水花，近白 0xEAF9FF 只给撞击那一下的强调。
 * 起击收：起 crouch 10t ／ 冲 sweep 沿机制实际轨迹 ／ 击 strike 24t ／ 翻 return 沿实际抛弧 ／ 落 land 24t ／ 空 miss 18t。
 * 范围：本招没有区域，是一条单体接触线；sweep 的 polyline 是去路、return 的 polyline 是实际抛弧，
 *   两者都由服务端逐刻采样的真实身体位置连成（不再画一条预设线）。
 * 运动：sweep／return 的粒子沿 `data.path` 走 polyline；return 的顶点随身体一起升高再落下，画出「翻过去」的那道弧；
 *   顶棚压顶或目标过高时身体会提前停住、path 自然变短，水线就在当前点收住。
 * 数：strike／land 的水花数量直接读本招算出的 `motes`（物攻与速度派生），强度读 `intensity`（冲撞威力派生）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * crouch 起始  bubble        向内聚拢     0.16-0.05 6-10  0.6→0 ≤40
 * sweep  主体  bubble        沿 path 冲出 0.20-0.06 5-9   0.85→0 ≤80
 * sweep  水雾  smallbubble   沿 path 飘散 0.08-0.02 6-12  0.5→0 ≤60
 * strike 强调  impact_water  向外炸开     0.34-0.06 6-11  1→0   ≤48
 * strike 涟漪  ripple        贴地外扩     1.6-0.4   18-30 0.5→0 ≤24
 * return 尾流  smallbubble   沿 path 滑走 0.12-0.03 6-12  0.8→0 ≤70
 * return 水线  drip          沿 path 拖尾 0.10-0.02 6-12  0.6→0 ≤40
 * land   落水  impact_water  向外炸开     0.28-0.05 6-11  1→0   ≤40
 * land   涟漪  ripple        贴地外扩     1.3-0.35  16-26 0.5→0 ≤18
 * miss   空响  smallbubble   原地一小撮   0.10-0.04 8-14  0.4→0 ≤16
 */
const FlipTurnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: 18, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 10], size: [0.16, 0.05],
                    color: 0x9FE0FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        sweep: {
            duration: 0,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/bubble/bubble",
                    rate: 34, trail: { minDistance: 0.25 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 18,
                    lifetime: [5, 9], size: [0.2, 0.06], sizeMode: "index",
                    color: 0x4FB3E8, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "mist", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 24, trail: { minDistance: 0.3 },
                    direction: "velocity", speed: [0.0, 0.0], spread: 32,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xEAF9FF, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.05, 0.26], spread: 26,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xEAF9FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "ripple", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 5, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [18, 30], size: [1.6, 0.4],
                    color: 0x9FE0FF, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        return: {
            duration: 0,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wake", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 32, trail: { minDistance: 0.22 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 28,
                    gravity: 0.01, drag: 0.95,
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x4FB3E8, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "trail", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/drip",
                    rate: 16, trail: { minDistance: 0.32 },
                    direction: "velocity", speed: [0.0, 0.0],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x9FE0FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        land: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.2], spread: 28,
                    lifetime: [6, 11], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xEAF9FF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "ripple", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 4, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [16, 26], size: [1.3, 0.35],
                    color: 0x9FE0FF, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "bubbles", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.04],
                    color: 0xEAF9FF, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flipturn", 1, FlipTurnDefinition);
