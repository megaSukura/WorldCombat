/**
 * 伏特替换 / voltswitch 的客户端表现。
 *
 * 一句话：施法者身上先炸起细密的静电荷 → 一道亮黄电弧拖尾钉向目标、炸开一撮电花 →
 *   施法者在原点与落点各闪一下白蓝电光（真实起终点，不假装粒子沿路径逐段爬）。
 * 色相家族：电黄 0xFFE96A 画主线，近白黄 0xFFF6C8 画电弧与切换。
 * 起击收：起 charge 12t ／ 飞 bolt 沿投射物 ／ 击 strike 22t ／ 碰墙 block 20t ／ 空放 miss 18t ／ 起闪 switch 22t ／ 落闪 arrive 22t。
 * 运动：bolt 的发射器绑 `data.projectile` 跟随电弧本体；switch／arrive 是原点和落点的两点电闪，不沿固定 path 伪装位移。
 * 数：strike／bolt／switch／arrive 的电花数量直接读本招算出的 `motes`（特攻派生），强度读 `intensity`（电弧威力派生）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * charge  起始  electricity_white  贴身窜动   0.10-0.03 5-9   0.7→0 ≤60
 * charge  光点  glowingsparkle_yellow 向内聚 0.10-0.03 6-10  0.8→0 ≤40
 * bolt    主体  electricity_yellow 绑投射物   0.22-0.06 5-9   0.95→0 ≤70
 * bolt    电弧  electricity_white  绑投射物   0.10-0.03 4-8   0.8→0 ≤50
 * strike  强调  impact_electric    向外炸开   0.32-0.06 6-11  1→0   ≤46
 * block   碰墙  impact_electric    贴面炸开   0.26-0.05 5-9   0.9→0 ≤30
 * switch  起闪  electricity_white  原点炸开   0.14-0.04 5-9   0.85→0 ≤40
 * arrive  落闪  electricity_white  落点炸开   0.14-0.04 5-9   0.85→0 ≤40
 * miss    空响  electricity_white  实际终点   0.10-0.04 8-14  0.4→0 ≤16
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
        block: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "wall", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.16 },
                    direction: "outward", speed: [0.05, 0.2], spread: 32,
                    lifetime: [5, 9], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        switch: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "leave", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22], spread: 30,
                    lifetime: [5, 9], size: [0.14, 0.04], sizeMode: "index",
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        arrive: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "land", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22], spread: 30,
                    lifetime: [5, 9], size: [0.14, 0.04], sizeMode: "index",
                    color: 0x9FD8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
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
