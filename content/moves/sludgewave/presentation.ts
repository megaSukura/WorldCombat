/**
 * 污泥波 / sludgewave 的客户端表现。
 *
 * 一句话：施法者脚边鼓起泥泡，随后一整圈厚污泥自身体同时向周围泼散，泥点粘到人身上片刻再滑落；
 * 泼过即散，不留持续的危险场。
 * 色相家族：污泥绿与毒紫（goo/sludgesplash / goo/ooze / bubble/poisonbubble / mud/mudsplash）为主体，
 * 深绿灰做衬托，毒紫只出现在毒泡的小面积上。
 * 拍子：起（gurgle 冒泡）→ 击（splash 一次三维泼开、hit 溅身）→ 收（miss 空泼）。
 * 范围：splash 的半球按服务端传的 `data.radius` 与 `data.scale` 画出真实泼溅半径，`data.height` 决定毒泡升起的高度带。
 * 数：`data.marks`（威力派生）决定泼出的泥点量，`data.intensity`（威力派生）抬高亮度与发射率。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SludgewaveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gurgle: {
            duration: 14,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "bubbles", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.09], spread: 14,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0x9B6BC8, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "ooze", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 10, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.08], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0x6E8C3A, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "curtain", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "marks", fallback: 22 }, at: 1 },
                    shape: { kind: "hemisphere", radius: 3.4, thickness: 0.55 },
                    direction: "outward", speed: [0.12, 0.42], spread: 16,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.3, 0.5], sizeMode: "linear",
                    color: 0x7FB84A, alpha: [0.9, 0], light: "world", maxParticles: 170
                },
                {
                    name: "strands", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "marks", fallback: 14 }, at: 1 },
                    shape: { kind: "hemisphere", radius: 3.0, thickness: 0.4 },
                    direction: "outward", speed: [0.18, 0.5], spread: 20,
                    gravity: 0.08, drag: 0.92,
                    lifetime: [12, 24], size: [0.2, 0.04],
                    color: 0x6E8C3A, alpha: [0.85, 0], light: "world", maxParticles: 150,
                    child: { particle: "world_combat_core:cobblemon/generic/tinydust", gravity: 0.1, drag: 0.94,
                        lifetime: 14, size: [0.08, 0.02], color: 0x5E7A30, alpha: [0.6, 0] }
                },
                {
                    name: "toxbubbles", bind: "source", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "marks", fallback: 10 }, at: 1 },
                    shape: { kind: "cylinder", radius: 1.0, length: { data: "height", fallback: 1.4 } },
                    direction: "up", speed: [0.03, 0.14], spread: 14,
                    drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xA879D0, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.28], spread: 18,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "cling", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], spread: 18,
                    gravity: 0.12, drag: 0.93,
                    lifetime: [12, 24], size: [0.18, 0.03],
                    color: 0x7FB84A, alpha: [0.85, 0], light: "world", maxParticles: 50,
                    child: { particle: "world_combat_core:cobblemon/generic/mud/mudsplash", gravity: 0.12, drag: 0.95,
                        lifetime: 12, size: [0.1, 0.02], color: 0x5E7A30, alpha: [0.5, 0] }
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sputter", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 16 },
                    shape: { kind: "hemisphere", radius: 1.4, thickness: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], spread: 14,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x6E8C3A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sludgewave", 1, SludgewaveDefinition);
