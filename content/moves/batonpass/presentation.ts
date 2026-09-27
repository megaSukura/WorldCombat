/**
 * 接棒 / batonpass 的客户端表现。
 *
 * 一句话：施法者把身上散着的劲收成一根发亮的接力棒 → 短棒沿真实的施法者→伙伴端点一截截推进、点亮伙伴 → 施法者向反方向拖出退步线。
 * 色相家族：接力黄绿 0x9FE6A0 画主线，近白黄 0xF2F7B0 只给交接的那一下，暗苔绿 0x5B7A2A 作贴地余韵。
 * 起击收：起 gather 12t ／ 飞 stream 沿机制子段推进 ／ 击 lend 26t ／ 退 step 沿实际子段 ／ 空 lone 18t。
 * 范围：本招是一条「施法者→伙伴」的单体连线；stream 每刻只按当前真实子段发射，玩家看着短棒一截截飞到伙伴手里。
 * 运动：stream 的发射器绑 `data.path` 的两点（上一刻→这一刻），rate 直接读 `motes`，因此整条棒是推进而不是整线同时撒点；
 *   step 同样只画当前子段。
 * 数：stream 的粒子发射率读本招算出的 `motes`（物攻＋特攻派生），lend 的爆发读 `moved`（实际递出的等级数），
 *   强度读 `intensity`（递出等级越多越亮）；gather 的收集量读 `items`（实际待移项目数）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * gather 起始  accentorb    向内聚拢   0.08-0.02 8-14  0.7→0 ≤40
 * stream 主体  energyorb    沿子段推进 0.16-0.04 8-14  0.9→0 ≤60
 * stream 细节  glowingsparkle 沿子段拖 0.06-0.01 8-14 0.7→0 ≤60
 * lend   强调  orb          球面向外   0.34-0.05 8-14  1→0   ≤48
 * lend   余韵  glowingsparkle 球向外    0.10-0.02 10-18 0.8→0 ≤40
 * lone   空响  smoke        原地一小撮 0.12-0.04 8-14  0.4→0 ≤16
 * step   退步  quickattack_dashlines 沿子段 0.5-0.1 6-10 0.6→0 ≤24
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
                },
                {
                    name: "tally", bind: "source", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: { data: "items", fallback: 4 } },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "inward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xF2F7B0, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        stream: {
            duration: 40,
            exit: { drain: 14 },
            emitters: [
                {
                    name: "baton", bind: "path", fit: "world", shape: { kind: "polyline" },
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 18 },
                    direction: "shape", speed: [0.0, 0.03], spread: 14,
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x9FE6A0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "trail", bind: "path", fit: "world", shape: { kind: "polyline" },
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
            duration: 40,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "back", bind: "path", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.15], rate: 30,
                    lifetime: [6, 10], size: [0.5, 0.1], sizeMode: "index",
                    color: 0x9FE6A0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_batonpass", 1, BatonPassDefinition);
