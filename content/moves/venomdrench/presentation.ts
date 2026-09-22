/**
 * 毒液陷阱 / venomdrench 的客户端表现。
 *
 * 一句话：黏稠的毒液从身上向四周泼开成一整圈 → 被毒浸透的人身上浮起紫黑的毒光、手脚变钝，毒液顺身滴落；
 *   没中毒的人只是被淋湿一层、很快滑落。色相家族：毒紫 0x9A5CC8 为主体，酸绿 0xA8D24A 落在细节层，
 *   暗紫 0x3A1F4A 作余韵。
 * 拍子：起（gather 0–12t）→ 泼（splash 0–30t）→ 中／湿（drenched 0–26t ／ washed 0–20t）→ 滴（linger 0–20t）。
 * 范围：splash 的毒环绑脚点、fit none，半径按 `data.scale`（实际泼洒半径 / 4.0）推出——画面里的环就是会
 *   被黏到的范围。
 * 运动：gather 毒滴向身上收拢；splash 一圈毒液沿地面向外泼开（速度按 `data.spray`）；drenched 毒光从脚边
 *   向上冒、再顺身滴落；washed 只是零星水珠向外滑落。
 * 数：毒滴数量绑 `data.drops`（特攻派生），削弱级数绑 `data.drop`，强弱绑 `data.intensity`。
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
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "drops", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.06, { data: "spray", fallback: 0.14 }],
                    gravity: 0.06, lifetime: [14, 26], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x9A5CC8, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "acid", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: { data: "drops", fallback: 20 } },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.04, 0.2],
                    gravity: 0.07, lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xA8D24A, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "ooze", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 4.0 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [16, 28], size: [0.2, 0.04],
                    color: 0x3A1F4A, alpha: [0.5, 0], light: "world", maxParticles: 50
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
