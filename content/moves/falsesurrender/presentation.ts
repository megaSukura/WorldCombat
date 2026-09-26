/**
 * 假跪真撞 / falsesurrender 的客户端表现。
 *
 * 一句话：施法者伏地低头，身上坠下一层暗影、乱发竖起；随后一束凌乱的黑发从最低处逐刻伸刺出去，
 * 尖端先真正推进、碰到身体或墙就停；命中处炸开一道暗色裂口把它撞得一顿，随后发束按原路缩回身边。
 * 色相家族：近黑与暗紫（obscuringsmoke／scalingshaded／impact_dark），发梢用一点苍白的紫灰挑亮。
 * 拍子：起（feign 伏低）→ 击（lash 发刺逐刻延伸、hit 命中、stagger 撞顿、wall 撞墙）→ 收（miss 落空 / 缩回）。
 * 范围：lash 用 `data.path` 画出服务端当前真实的发刺线段（基端随施法者、尖端逐刻推进），发梢到哪就是判定到哪。
 * 运动：暗影从身上沉下，发束沿低处的线段由内向外推进，命中处暗色向外裂开，停下后沿原路收回。
 * 数：`data.intensity`（突刺威力派生）抬高发束与命中的亮度，`data.notes`（威力派生）决定裂口碎屑量，
 * `data.ambush`（是否骗到注意）选择强调色（骗到时更亮的一圈苍白紫），`data.scale`（发梢半径派生）缩放发束宽度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FalsesurrenderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        feign: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 16, shape: { kind: "hemisphere", radius: 0.45 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.26, 0.08],
                    color: 0x2A2438, alpha: [0.45, 0], light: "world", maxParticles: 50
                },
                {
                    name: "bristle", bind: "source", offset: [0, 0.18, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 14, shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.03, 0.14], spread: 30,
                    lifetime: [7, 14], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x6A5A8A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        lash: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "strand", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.06, 0.24], spread: 14,
                    lifetime: [5, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x9A8AB8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 140
                },
                {
                    name: "lacerate", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.08, 0.28], spread: 18,
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0xD8D0E8, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 110
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "notes", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x6A5A8A, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "whip", bind: "target", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 12 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], spread: 24,
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0xD8D0E8, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.85, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "ambush", fallback: 0 }, at: 2 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD8D0E8, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 24
                }
            ]
        },
        stagger: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "trip", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x3A3448, alpha: [0.45, 0], light: "world", maxParticles: 40
                },
                {
                    name: "haunt", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: 8, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x4A3E5E, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        wall: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wall_hit", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [5, 11], size: [0.24, 0.03],
                    color: 0x6A5A8A, alpha: [0.9, 0], light: "world", maxParticles: 50
                },
                {
                    name: "wall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0x3A3448, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x6A5A8A, alpha: [0.5, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_falsesurrender", 1, FalsesurrenderDefinition);
