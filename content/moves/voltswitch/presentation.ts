/**
 * 伏特替换 / voltswitch 的客户端表现。
 *
 * 一句话：施法者身上先炸起细密的静电荷 → 一道亮黄电弧拖尾钉向目标、炸开一撮电花 →
 *   施法者沿一条白蓝色的电流线瞬移到落点，原地留下嗡嗡作响的电荷环，环里偶有电花窜起。
 * 色相家族：电黄 0xFFE96A 画主线，近白黄 0xFFF6C8 画电弧与切换，冷白蓝 0x9FD8FF 只给余电区。
 * 起击收：起 charge 12t ／ 飞 bolt 沿投射物 ／ 击 strike 22t ／ 切 switch 24t ／ 续 residue+field 持续 ／ 电 zap 16t。
 * 范围：余电区是一块真的地面区域，residue 的环半径直接读 `data.radius`（本招算出的 fieldRadius），
 *   玩家一眼看出站在哪里会被电。
 * 运动：bolt 的发射器绑 `data.projectile` 跟随电弧本体；switch 的粒子沿 `data.path`（原位置→落点）走 polyline。
 * 数：strike／bolt 的电花数量直接读本招算出的 `motes`（特攻派生），强度读 `intensity`（电弧威力派生）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * charge  起始  electricity_white  贴身窜动   0.10-0.03 5-9   0.7→0 ≤60
 * charge  光点  glowingsparkle_yellow 向内聚 0.10-0.03 6-10  0.8→0 ≤40
 * bolt    主体  electricity_yellow 绑投射物   0.22-0.06 5-9   0.95→0 ≤70
 * bolt    电弧  electricity_white  绑投射物   0.10-0.03 4-8   0.8→0 ≤50
 * strike  强调  impact_electric    向外炸开   0.32-0.06 6-11  1→0   ≤46
 * switch  切换  electricity_white  沿 path 冲 0.14-0.04 5-9   0.85→0 ≤60
 * residue 余韵  electricity_yellow 贴地外扩   0.8-0.3   16-28 0.5→0 ≤40
 * field   持续  electricity_yellow 贴地脉冲   0.3-0.7   20-34 0.3→0 ≤50
 * field   细节  glowingsparkle_yellow 缓慢升 0.10-0.03 14-22 0.6→0 ≤60
 * zap     电击  impact_electric    一点炸开   0.3-0.06  6-10  0.9→0 ≤20
 * miss    空响  electricity_white  原地一小撮 0.10-0.04 8-14  0.4→0 ≤16
 */
const VoltSwitchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "arcs", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 22, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.16], spread: 40,
                    lifetime: [5, 9], size: [0.1, 0.03],
                    color: 0xFFF6C8, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 10], size: [0.1, 0.03],
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        bolt: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 40, trail: { minDistance: 0.2 },
                    direction: "velocity", speed: [0.0, 0.0], spread: 16,
                    lifetime: [5, 9], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xFFE96A, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "halo", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 24, trail: { minDistance: 0.16 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 34,
                    lifetime: [4, 8], size: [0.1, 0.03],
                    color: 0xFFF6C8, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.06, 0.28], spread: 28,
                    lifetime: [6, 11], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 46
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        switch: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "current", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 34, trail: { minDistance: 0.2 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 24,
                    lifetime: [5, 9], size: [0.14, 0.04],
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        residue: {
            duration: 28,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 20, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.8 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [16, 28], size: [0.8, 0.3], sizeMode: "index",
                    color: 0xFFE96A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        field: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "live", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "motes", fallback: 16 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.8 } },
                    direction: "up", speed: [0.02, 0.09], spread: 40,
                    lifetime: [20, 34], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0xFFE96A, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 50
                },
                {
                    name: "fizz", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 2.8 } },
                    direction: "up", speed: [0.02, 0.08], gravity: 0.004,
                    lifetime: [14, 22], size: [0.1, 0.03],
                    color: 0xFFF6C8, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        zap: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "jolt", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "motes", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [6, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.04],
                    color: 0xFFF6C8, alpha: [0.4, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_voltswitch", 1, VoltSwitchDefinition);
