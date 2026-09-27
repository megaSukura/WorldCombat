/**
 * 碉堡的客户端表现。
 *
 * 一句话：一座毒壁从脚边鼓起、合拢，围着自己立成一圈短壁；壁底画着「站住的位置」这一小圈；
 * 来击在壁缘真实接触侧溅开毒浆，接触者被倒钩从壁缘滴着毒液灌进身体；变化招式被毒壁封住，离开原位或量尽时碉堡塌成一滩。
 * 色相家族：毒紫为主体（ooze／impact_poison／poisonbubble），暗绿与灰烟为中性陪衬。
 * 拍子：起（raise 0–18t）→ 守（hold，毒壁＋脚下锚圈）→ 击（block 每次拦截、punish 每次灌毒）→ 收（fall 塌成一滩）。
 * 几何：hold／raise 的毒壁与锚圈按 `data.radius`（本次碉堡实际半径，世界格）与 `data.anchor`（离位容差）铺开，
 *      用 `fit:"world"` 保持世界单位，不再把半径当比例二次缩放；`data.scale` 只负责粒子尺寸。
 * 钉位：raise／hold／block／fall 全部读 `data.point`（原位锚点或实际接触点）并用点绑定，角色走开时画面不跟着飘。
 * 数：`data.venous` 是 punish 毒泡数量，`data.worsen` 决定是否更密更亮，`data.intensity` 决定持壁亮度。
 */
const BanefulBunkerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 18,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    // 围自身合拢的短毒壁：世界半径来自本次机制值。
                    name: "wall", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    rate: 34, shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 0.9, thickness: 1 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x7D4B9E, alpha: [0.9, 0], gravity: 0.05, drag: 0.92,
                    light: "world", maxParticles: 130
                },
                {
                    name: "bubbles", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xA46FC4, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "footing", bind: "source", offset: [0, 0.015, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 8, shape: { kind: "ring", radius: { data: "anchor", fallback: 0.9 } },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.28, 0.05],
                    color: 0x8E5CB0, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "fumes", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [16, 30], size: [0.3, 0.08],
                    color: 0x6B5A78, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hold: {
            // 持续状态：闭合毒壁＋贴地锚圈，钉在锚点（data.point）上，随毒壁托管效果存续。
            emitters: [
                {
                    name: "wall_band", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 8, shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.6 }, length: 0.85, thickness: 1 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [26, 44], size: [0.24, 0.24], sizeMode: "sin",
                    color: 0x6E4A8C, alpha: [0.4, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 30
                },
                {
                    name: "seep", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 5, shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [24, 40], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xA46FC4, alpha: [0.5, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 16
                },
                {
                    // 离位阈值：脚下这一小圈就是「站住」的范围，走出即塌。
                    name: "footing", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 4, shape: { kind: "ring", radius: { data: "anchor", fallback: 0.9 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [22, 34], size: [0.3, 0.06], sizeMode: "sin",
                    color: 0x8E5CB0, alpha: [0.3, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 14
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "splash", bind: "point", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 14, at: 1 }, shape: { kind: "arc", radius: 0.6, arcDegrees: 120 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.34, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "spatter", bind: "point", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: 22 },
                    shape: { kind: "arc", radius: 0.65, arcDegrees: 150 },
                    direction: "outward", speed: [0.09, 0.26], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8E5CB0, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ripple", bind: "point", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "arc", radius: 0.65, arcDegrees: 150 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [8, 14], size: [0.34, 0.1],
                    color: 0xB58ad0, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        punish: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    // 毒线沿 data.path（壁缘实际接触点 → 攻击者）滴过去，端点是活体引用，随它移动。
                    name: "venom_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "venous", fallback: 8 } }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.08, 0.24], spin: 16,
                    lifetime: [10, 20], size: [0.15, 0.02], sizeMode: "index",
                    color: 0xB77BD8, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "venom", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: { data: "venous", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 26 },
                    direction: "shape", speed: [0.1, 0.3], spin: 18,
                    lifetime: [10, 20], size: [0.17, 0.02], sizeMode: "index",
                    color: 0xB77BD8, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "burst", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "drops", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 14 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.08, drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x7D4B9E, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        deflect: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "seal", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.5, 0.1],
                    color: 0x8E5CB0, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "hiss", bind: "target", height: 0.5, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 20 },
                    shape: { kind: "arc", radius: 0.6, arcDegrees: 130 },
                    direction: "outward", speed: [0.09, 0.26],
                    lifetime: [10, 20], size: [0.13, 0.02],
                    color: 0xA46FC4, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        fall: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.4, 0], height: 0.35, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 30 },
                    shape: { kind: "hemisphere", radius: 0.55 },
                    direction: "down", speed: [0.04, 0.16], gravity: 0.08, drag: 0.9,
                    lifetime: [16, 28], size: [0.24, 0.04], sizeMode: "index",
                    color: 0x5E3F78, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "puddle", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: [0.42, 0.1],
                    color: 0x6E4A8C, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "fumes", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [18, 32], size: [0.28, 0.08],
                    color: 0x60506E, alpha: [0.3, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_banefulbunker", 1, BanefulBunkerDefinition);
