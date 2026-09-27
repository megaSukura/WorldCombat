/**
 * 急速折返 / uturn 的客户端表现。
 *
 * 一句话：施法者身边先抖起一层细粉 → 贴着一条虫黄色的弧线切向目标、撞出一撮甲壳碎屑 →
 *   再沿另一条弧线滑回自己一侧，路上又抖落一层粉。
 * 色相家族：虫甲黄绿 0xBFE24B 画主线，暗苔绿 0x5B7A2A 画贴地粉尘，近白黄 0xEAF7C0 只给撞击那一下的强调。
 * 起击收：起 coil 10t ／ 切 sweep 沿机制轨迹 ／ 击 strike 24t ／ 挡 blocked 18t ／ 收 return 26t ／ 空 miss 18t。
 * strike 只在伤害真正落地时出现；伤害被拒或撞到友方只走 blocked 的中性一碰，不再放撞击的亮爆点。
 * 范围：本招没有区域，是一条单体接触线；sweep 与 return 每刻只传本刻真实走过的脚点子段，逐刻拼出「切进去从哪回来」。
 * 运动：sweep／return 的 polyline 只覆盖当前真实子段，粒子沿该段发射，速度与机制一致；不再一次传整条累计路径。
 *   累计路径会让整条线每刻重复采样，读不出身体实际扫到哪；子段与判定共用同一组脚点。
 * 数：strike 的碎屑数量直接读本招算出的 `motes`（物攻与速度派生），强度读 `intensity`（撞击威力派生）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * coil   起始  ground_bugs  向内聚拢     0.07-0.02 6-10  0.6→0 ≤40
 * sweep  主体  flying_bugs  沿 path 冲出 0.14-0.04 5-9   0.9→0 ≤80
 * sweep  贴地  ground_bugs  沿 path 落下 0.08-0.01 6-12  0.7→0 ≤60
 * strike 强调  impact_bug   向外炸开     0.30-0.05 6-11  1→0   ≤48
 * strike 光点  energyorb    原地一亮     0.4-0.05  8-14  0.8→0 ≤24
 * blocked 中性  smoke        原地一小撮   0.12-0.04 6-11  0.4→0 ≤20
 * return 回路  ground_bugs  沿 path 滑回 0.10-0.02 6-12  0.8→0 ≤60
 * return 光点  energyorb    沿途拖尾     0.3-0.05  8-14  0.6→0 ≤40
 * miss   空响  smoke        原地一小撮   0.12-0.05 8-14  0.4→0 ≤16
 */
const UTurnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 18, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0xBFE24B, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        sweep: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 36, trail: { minDistance: 0.25 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 18,
                    lifetime: [5, 9], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xBFE24B, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "dust", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 22, trail: { minDistance: 0.3 },
                    direction: "velocity", speed: [0.0, 0.0], spread: 30,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x5B7A2A, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        strike: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shell", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.05, 0.25], spread: 24,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF7C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 3, at: 1 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xEAF7C0, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "bump", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [6, 11], size: [0.12, 0.04],
                    color: 0x5B7A2A, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        return: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "back", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: 30, trail: { minDistance: 0.22 },
                    direction: "velocity", speed: [0.0, 0.02], spread: 26,
                    gravity: 0.01, drag: 0.95,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x9CCB3B, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glow", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 14, trail: { minDistance: 0.34 },
                    direction: "velocity", speed: [0.0, 0.0],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xBFE24B, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.05],
                    color: 0x5B7A2A, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_uturn", 1, UTurnDefinition);
