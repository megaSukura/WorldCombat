/**
 * 爆炸头突击 / headcharge 的客户端表现。
 *
 * 一句话：低着头、把爆炸头鼓到最大，沿一条线长驱直入；撞中谁就在谁身上炸开一团头毛与尘屑，身体不停继续冲，
 * 直到冲程尽头才收势；一条直线没人就让开，冲过去什么也不碰。
 * 色相家族：深棕（0x6B5236）是爆炸头的毛色，米白（0xE8DFC9）是撞实一刻的冲击，尘土黄（0x9A8A6B）铺在脚下。
 * 拍子：起 windup（鼓毛蓄势）→ 冲 charge（长距离冲刺）＋ track（跟随轨迹的地面尘带）→ impact（每个目标各一次）→ end（收势）。
 * 范围：track 的尘带跟着身体走，`data.direction` 给出它朝哪，画的就是这一冲扫过的区域；锁定式转弯时尘带跟着弯。
 * 运动：速度线沿冲撞方向掠过；撞中后头毛与碎屑沿冲撞方向撒开，目标被顶开。
 * 数：`data.hits`（这一冲累计撞中几个）决定命中迸发的头毛数，`data.afro`（体型与速度派生）决定冲线与尘带的密度，
 * `data.intensity`（撞劲 / 120）抬高亮度，`data.hunt`（1 表示锁定式）决定冲刺线是否有偏转拖尾。
 */
const HeadchargeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "ruffle", bind: "source", offset: [0, 0.85, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0x6B5236, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "plant", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 12, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.1], spread: 12,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 34
                }
            ]
        },
        charge: {
            duration: 56,
            exit: { stop: 34, drain: 16 },
            emitters: [
                {
                    name: "rush", bind: "source", offset: [0, 0.5, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 48, shape: { kind: "box", size: [0.38, 0.3, 0.38] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.2, 0.06],
                    color: 0xE8DFC9, alpha: [0.75, 0], light: "full", maxParticles: 300
                },
                {
                    name: "hair", bind: "source", offset: [0, 0.95, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 24, shape: { kind: "box", size: [0.44, 0.3, 0.44] },
                    direction: "outward", speed: [0.02, 0.12], spread: 20,
                    lifetime: [7, 13], size: [0.22, 0.05],
                    color: 0x6B5236, alpha: [0.6, 0], light: "world", maxParticles: 200
                }
            ]
        },
        track: {
            duration: 10,
            emitters: [
                {
                    name: "sweep", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "afro", fallback: 24 }, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18], spread: 10,
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 180
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "slam", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "burst", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.07, 0.28], spread: 15,
                    lifetime: [8, 14], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xE8DFC9, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "fur", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "outward", speed: [0.08, 0.26], spin: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 20], size: [0.22, 0.05],
                    color: 0x6B5236, alpha: [0.75, 0], light: "world", maxParticles: 60
                },
                {
                    name: "grit", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.52 },
                    direction: "outward", speed: [0.08, 0.22], spread: 8,
                    lifetime: [10, 17], size: [0.34, 0.08],
                    color: 0xCFC7BC, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        end: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "settle", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "afro", fallback: 24 } },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [9, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 80
                },
                {
                    name: "puff", bind: "source", offset: [0, 0.85, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.26, 0.06],
                    color: 0x6B5236, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_headcharge", 1, HeadchargeDefinition);
