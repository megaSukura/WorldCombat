/**
 * 毒液陷阱 / venomdrench 的客户端表现。
 *
 * 一句话：黏稠的毒液从身上短泼向范围内每个非友方 → 被毒浸透的人身上浮起紫黑的毒光、手脚变钝，毒液顺身滴落；
 *   没中毒的人只是被淋湿一层、很快滑落；隔着实体方块的泼在墙上，墙后不受影响。色相家族：毒紫 0x9A5CC8 为主体，
 *   酸绿 0xA8D24A 落在细节层，暗紫 0x3A1F4A 作余韵。
 * 拍子：起（gather 0–12t）→ 泼（splash 0–30t：脚下一圈判读范围；pour 从身上到目标；blocked 泼在墙上）
 *   → 中／湿（drenched 0–26t ／ washed 0–20t）→ 滴（linger 0–20t）。
 * 范围：splash 的毒环绑脚点、fit none，半径按 `data.scale`（实际泼洒半径 / 4.0）推出；pour/blocked 的毒液沿
 *   服务端给出的真实自身→目标连线（`data.path`）走，画面里的连线就是这一次真正泼过去的液体。
 * 运动：gather 毒滴向身上收拢；splash 只在地面标出范围；pour/blocked 毒液沿真实连线流过去；drenched 毒光从脚边
 *   向上冒、再顺身滴落；washed 只是零星水珠向外滑落。
 * 数：毒滴数量绑 `data.drops`（特攻派生），实际削弱级数绑 `data.applied`，强弱绑 `data.intensity`。
 * 参照节：视觉语言第二、三、四、五、六、九节。
 */
const VenomDrenchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "condense", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x9A5CC8, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        splash: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "range", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: { data: "drops", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: 4.0, thickness: 0.06 },
                    direction: "up", speed: [0.01, 0.03],
                    gravity: 0.05, lifetime: [12, 22], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x3A1F4A, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "acid", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 12 } },
                    shape: { kind: "ring", radius: 4.0, thickness: 0.03 },
                    direction: "up", speed: [0.01, 0.03],
                    gravity: 0.07, lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xA8D24A, alpha: [0.55, 0], light: "full", maxParticles: 70
                }
            ]
        },
        pour: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stream", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "drops", fallback: 14 }, at: 0 },
                    direction: "shape", speed: [0.04, 0.18], spread: 12,
                    gravity: 0.06, lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x9A5CC8, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "acid_trail", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "drops", fallback: 6 } },
                    direction: "shape", speed: [0.03, 0.12], spread: 16,
                    gravity: 0.04, lifetime: [9, 17], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xA8D24A, alpha: [0.7, 0], light: "full", maxParticles: 44
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wall_stream", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "drops", fallback: 10 }, at: 0 },
                    direction: "shape", speed: [0.03, 0.14], spread: 14,
                    gravity: 0.06, lifetime: [8, 16], size: [0.15, 0.03],
                    color: 0x9A5CC8, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "wall_splash", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.12], spread: 24,
                    gravity: 0.08, lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0xA8D24A, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        drenched: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "mark", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 16], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xA8D24A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "climb", bind: "target", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: { data: "drop", fallback: 1 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x9A5CC8, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "drip", bind: "target", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/drip",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.01, 0.05],
                    gravity: 0.05, lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x3A1F4A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        washed: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "rinse", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "drops", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9AA8B8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        linger: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "trickle", bind: "target", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 5, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0x9A5CC8, alpha: [0.45, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_venomdrench", 1, VenomDrenchDefinition);
