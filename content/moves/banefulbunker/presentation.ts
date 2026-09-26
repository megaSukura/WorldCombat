/**
 * 碉堡的客户端表现。
 *
 * 一句话：一座毒壁从脚边鼓起、合拢、钉在释法的那一小块地；壁面渗着毒液；来击在壁面接触点溅开毒浆，
 * 接触者被倒钩从实际接触点滴着毒液灌进身体、身周浮起紫色泡沫；变化招式被毒壁封住，离开原位或量尽时碉堡塌成一滩。
 * 色相家族：毒紫为主体（ooze／impact_poison／poisonbubble），暗绿与灰烟为中性陪衬。
 * 拍子：起（raise 0–18t，毒浆自下而上鼓成壁）→ 击（block 每次拦截、punish 每次灌毒）→ 收（fall 塌成一滩）。
 * 范围：hold 的毒环按 `data.scale`（碉堡半径／1.6）铺开——画面就是被判定的那一圈。
 * 钉位：raise／hold／block／fall 全部读 `data.point`（raise 与 hold 是原位锚点，block 是实际来袭接触点，
 *      fall 是毒壁原本的位置）并用 `bind:"point"`，所以角色走开时画面不会跟着飘。
 * 运动：起手毒浆上涌并合拢；持壁缓慢起伏；灌毒沿 `data.path`（接触点→攻击者）涌出一条真实毒线，再在攻击者身上炸开。
 * 数：`data.venous`（灌毒时长／40）就是 punish 毒泡的数量，`data.worsen` 决定是否更密更亮，
 *      `data.intensity` 决定持壁亮度，`data.scale` 放大毒环。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BanefulBunkerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 18,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "wall", bind: "source", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    rate: 30, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.3, 0.06], sizeMode: "index",
                    color: 0x7D4B9E, alpha: [0.9, 0], gravity: 0.05, drag: 0.92,
                    light: "world", maxParticles: 110
                },
                {
                    name: "bubbles", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 20, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xA46FC4, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "fumes", bind: "source", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 14, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [16, 30], size: [0.3, 0.08],
                    color: 0x6B5A78, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hold: {
            // 持续状态：低密度毒环与缓慢上浮的毒泡，钉在锚点（data.point）上，随毒壁托管效果存续。
            emitters: [
                {
                    name: "ooze_ring", bind: "point", offset: [0, 0.02, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 6, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [26, 44], size: [0.24, 0.24], sizeMode: "sin",
                    color: 0x6E4A8C, alpha: [0.35, 0.1], alphaMode: "sin",
                    light: "world", maxParticles: 22
                },
                {
                    name: "seep", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 5, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [24, 40], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xA46FC4, alpha: [0.5, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 16
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
                    // 毒线沿 data.path（壁面实际接触点 → 攻击者）滴过去，端点是活体引用，随它移动。
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
                    name: "seal", bind: "target", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
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
