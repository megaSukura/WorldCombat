/**
 * 岩斧 / stoneaxe 的客户端表现。
 *
 * 一句话：岩斧举过头顶、斧刃结起石屑 → 一斧劈下在目标身上拉出一道岩痕、斧头崩裂 → 数量有限的岩石碎片在落点
 *   悬成一圈，余量越多圈上石块越多；每个新进入的敌人被从它正上方落下的一块岩砸中，屋顶会先一步挡住下落岩，
 *   砸完余量归零整片散尽；崩解式第一次被闯进就一次全落。
 * 色相家族：岩石灰褐 0xB7B3A6 / 0x8A7F6B 为主，近白高光 0xE7E2D6 作斧刃与碎石尖端；没有第二个色相。
 * 拍子：起（windup 举斧聚屑）→ 劈（chop 过顶斧痕，截到真实接触）→ 悬（raise 浮起；石阵逐帧 sprite 画在
 *   `world_combat:move_stoneaxe/field` 自定义场景里，一枚库存一枚图）→ 落（fall 离轨飞落 / hit 砸中 /
 *   blocked 撞墙顶 / settle 空落收尘 / shatter 崩解整落）→ 竭（spent 散尽）。
 * 范围：raise / spent 绑 `point`、`fit:"world"`，用 `data.radius` 与 `data.lift` 画世界尺寸的圈，半径只缩放这一次；
 *   石阵库存由服务端 slots 决定，客户端不再乘 scale。
 * 运动：起手石屑向斧刃收；劈下时斧痕沿过顶弧自上而下拉过；碎片沿 `data.drop` 飞落。
 * 数：`data.rocks`（剩余库存派生）决定悬浮石数量、`data.drop`（真实落距）决定下落线长度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const StoneaxeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "grit", bind: "source", offset: [0, 0.9, 0.3], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.1], spin: 10,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x8A7F6B, alpha: [0.75, 0], maxParticles: 40
                },
                {
                    name: "edge", bind: "source", offset: [0, 0.95, 0.32], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 3, interval: 4, repeats: 2 },
                    shape: { kind: "line", length: 0.5, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.01, 0.05], spin: 8,
                    lifetime: [8, 14], size: [0.2, 0.06],
                    color: 0xE7E2D6, alpha: [0.7, 0], maxParticles: 16
                }
            ]
        },
        chop: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "axe_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 44, direction: "shape", speed: [0.04, 0.16], spread: 10,
                    lifetime: [5, 11], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xE7E2D6, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "rocks", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spread: 18, gravity: 0.03, spin: 16,
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xB7B3A6, alpha: [0.85, 0], maxParticles: 80
                }
            ]
        },
        raise: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 30 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.24, 0.5],
                    color: 0xB7B3A6, alpha: [0.6, 0], maxParticles: 60
                },
                {
                    name: "lift", bind: "point", offset: [0, 0, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "rocks", fallback: 20 }, interval: 2, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "up", speed: [0.08, 0.22], spread: 16, spin: 24,
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0x8A7F6B, alpha: [0.9, 0], maxParticles: 110
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 28 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xB7B3A6, alpha: [0.5, 0], maxParticles: 60
                }
            ]
        },
        // 一枚没撞到任何东西的弹体自然结束：在真实末点收一小撮尘，不用满射程点假造终点。
        settle: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "settle_dust", bind: "point", offset: [0, 0.1, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "rocks", fallback: 4 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.04,
                    lifetime: [7, 14], size: [0.08, 0.02],
                    color: 0xB7B3A6, alpha: [0.5, 0], maxParticles: 20
                }
            ]
        },
        // 一枚悬岩离轨飞落：沿真实落距的一段轨迹，数量随余量。坐标与速度用世界单位。
        fall: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "drop", bind: "point", offset: [0, 0, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "rocks", fallback: 12 }, at: 1 },
                    shape: { kind: "line", length: { data: "drop", fallback: 1.4 }, rotation: [180, 0, 0] },
                    direction: "down", speed: [0.18, 0.4], spread: 8, spin: 20,
                    lifetime: [5, 10], size: [0.22, 0.26],
                    color: 0xE7E2D6, alpha: [0.95, 0], light: "full", maxParticles: 40
                },
                {
                    name: "trail", bind: "point", offset: [0, 0, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "rocks", fallback: 8 } },
                    shape: { kind: "line", length: { data: "drop", fallback: 1.4 }, rotation: [180, 0, 0] },
                    direction: "down", speed: [0.14, 0.34], spread: 12, spin: 18,
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0x8A7F6B, alpha: [0.8, 0], maxParticles: 30
                }
            ]
        },
        // 竖直段被屋顶拦住：只砸在方块表面的一小片崩屑，不伤目标。
        blocked: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "splinter", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "rocks", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.05, spin: 24,
                    lifetime: [7, 14], size: [0.12, 0.02],
                    color: 0x8A7F6B, alpha: [0.7, 0], maxParticles: 24
                }
            ]
        },
        // 余量归零：石阵散尽前最后落下的碎屑。
        spent: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "crumble", bind: "point", offset: [0, 0.1, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.4 } },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xB7B3A6, alpha: [0.55, 0], maxParticles: 50
                },
                {
                    name: "last_chips", bind: "point", offset: [0, { data: "lift", fallback: 1.4 }, 0], fit: "world",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 2.4 } },
                    direction: "down", speed: [0.06, 0.2], gravity: 0.05, spin: 20,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x8A7F6B, alpha: [0.7, 0], maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "rocks", fallback: 16 }, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.08, 0.24], spread: 20,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE7E2D6, alpha: [1, 0], maxParticles: 40
                },
                {
                    name: "chips", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "rocks", fallback: 10 } },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spin: 22,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xB7B3A6, alpha: [0.85, 0], maxParticles: 50
                }
            ]
        },
        shatter: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "collapse", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "rocks", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.12, 0.34], spread: 22,
                    lifetime: [6, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                },
                {
                    name: "avalanche", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "rocks", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.1, 0.3], gravity: 0.05, spin: 20,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0x8A7F6B, alpha: [0.9, 0], maxParticles: 80
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "vital", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.32], spread: 14,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 40
                },
                {
                    name: "chips", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.09, 0.28], spin: 26,
                    lifetime: [7, 14], size: [0.15, 0.03],
                    color: 0xB7B3A6, alpha: [0.9, 0], maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "rocks", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, spin: 18,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8A7F6B, alpha: [0.5, 0], maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stoneaxe", 1, StoneaxeDefinition);

/**
 * 悬浮石阵：按服务端真实轨位逐帧画固定数量的 atlas sprite，一枚库存一枚图，发出即少一枚；
 * 位置与高度都来自 `data.slots`（世界坐标已含半径与 lift），客户端不再二次乘 scale。无粒子生灭、无额外实体。
 */
WorldCombatClient.scene("world_combat:move_stoneaxe/field", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const slots = data.slots;
    if (!Array.isArray(slots)) return;
    const colour = (0xFFB7B3A6 | 0);
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!Array.isArray(slot) || slot.length < 4 || !slot[3]) continue;
        frame.sprite("cobblemon:particle/generic/large_rock", slot[0], slot[1], slot[2], 0.26, 0, colour, i % 6, false);
    }
});
