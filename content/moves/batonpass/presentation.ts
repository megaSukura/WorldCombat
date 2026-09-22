/**
 * 接棒 / batonpass 的客户端表现。
 *
 * 一句话：施法者把身上散着的劲收成一根发亮的接力棒 → 棒沿一条直线飞进伙伴身体、点亮他 → 施法者向反方向拖出退步线。
 * 色相家族：接力黄绿 0x9FE6A0 画主线，近白黄 0xF2F7B0 只给交接的那一下，暗苔绿 0x5B7A2A 作贴地余韵。
 * 起击收：起 gather 12t ／ 飞 stream 沿机制轨迹 ／ 击 lend 26t ／ 退 step 20t ／ 空 lone 18t。
 * 范围：本招是一条「施法者→伙伴」的单体连线；stream 的 polyline 就是棒真正走的路，玩家一眼看出交到谁手里。
 * 运动：stream 的粒子沿 `data.path` 顶点（施法者→伙伴）走 polyline；step 的速度线沿 `data.direction`（退步方向）拖出。
 * 数：stream／lend 的粒子数量直接读本招算出的 `motes`（物攻＋特攻派生）与 `moved`（实际递出的等级数），
 *   强度读 `intensity`（递出等级越多越亮）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * gather 起始  accentorb    向内聚拢   0.08-0.02 8-14  0.7→0 ≤40
 * stream 主体  energyorb    沿 path 飞 0.16-0.04 8-14  0.9→0 ≤60
 * stream 细节  glowingsparkle 沿 path 拖 0.06-0.01 8-14 0.7→0 ≤60
 * lend   强调  orb          球面向外   0.34-0.05 8-14  1→0   ≤48
 * lend   余韵  glowingsparkle 球向外    0.10-0.02 10-18 0.8→0 ≤40
 * lone   空响  smoke        原地一小撮 0.12-0.04 8-14  0.4→0 ≤16
 * step   退步  quickattack_dashlines 沿 direction 0.5-0.1 6-10 0.6→0 ≤24
 */
const BatonPassDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "collect", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x9FE6A0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        stream: {
            exit: { drain: 14 },
            emitters: [
                {
                    name: "baton", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 18 } },
                    direction: "shape", speed: [0.0, 0.03], spread: 14,
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x9FE6A0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "trail", bind: "path", fit: "none", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 26, trail: { minDistance: 0.25 },
                    direction: "velocity", speed: [0.0, 0.0],
                    lifetime: [8, 14], size: [0.06, 0.01], sizeMode: "index",
                    color: 0xF2F7B0, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        lend: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "take", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "moved", fallback: 2 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF2F7B0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "warm", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 22, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x9FE6A0, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        lone: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "drop", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [8, 14], size: [0.12, 0.04],
                    color: 0x5B7A2A, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        },
        step: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lines", bind: "source", offset: [0, 0.35, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    orient: "direction", shape: { kind: "cone", radius: 0.5, angleDegrees: 22 },
                    burst: { count: 6 }, direction: "away", speed: [0.1, 0.3],
                    lifetime: [6, 10], size: [0.5, 0.1], sizeMode: "index",
                    color: 0x9FE6A0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_batonpass", 1, BatonPassDefinition);
