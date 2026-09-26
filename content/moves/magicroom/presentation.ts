/**
 * 魔法空间 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下荡开一圈银灰的静默波纹，撑起一片把光吸走的空间；地上一层稀疏方格读出静默区的范围，
 * 谁带着真正被压制的装备走进来，身周浮现一圈熄灭的符纹；装备的效果离开空间后回亮。
 *
 * 色相家族：静默银（0xC8D0E0）为主体，近白（0xF0F4FF）做高光，灰蓝（0x8A93A8）做地面影与余韵。
 * 一个效果一个色相家族。持续层是贴地的边界环与稀疏方格，低密度、低高度，让出目标本体视线。
 * 层次：内收（起手）／边界环＋银尘（撑开）／贴地边界与方格（持续）／熄灭符纹（每件被压制装备）／回光（离圈）。
 * 起击收：windup（聚拢）→ open（撑开）→ inside（持续边界）→ chip（压制解除回亮）→ 收。
 * 数：撑开与持续的粒子量绑定服务端算出的 data.density；边界半径绑定 data.scale（机制半径／定义半径）；
 *   方格由自定义场景按 data.radius 画出；熄灭符纹由自定义场景按 data.count（真正被压制的件数）逐个画出。
 */
const MagicroomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "hush_gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 9, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [16, 26], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xF0F4FF, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        open: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "open_ring", bind: "point", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.34, 0.16],
                    color: 0xF0F4FF, alpha: [0.45, 0], light: "world", maxParticles: 70
                },
                {
                    name: "open_motes", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "density", fallback: 22 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.92,
                    lifetime: [18, 30], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC8D0E0, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "open_dust", bind: "point", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x8A93A8, alpha: [0.35, 0], light: "world", maxParticles: 36
                }
            ]
        },
        inside: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 5, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [20, 34], size: [0.28, 0.1], sizeMode: "sin",
                    color: 0xC8D0E0, alpha: [0.24, 0], alphaMode: "sin", light: "world", maxParticles: 34
                },
                {
                    name: "edge_dots", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "density", fallback: 22 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF0F4FF, alpha: [0.2, 0], light: "world", maxParticles: 28
                }
            ]
        },
        chip: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "chip_return", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.13], drag: 0.94,
                    lifetime: [12, 20], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF0F4FF, alpha: [0.65, 0], light: "full", bloom: 0.18, maxParticles: 28
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magicroom", 1, MagicroomDefinition);

// 稀疏方格：贴地画一层被圆形边界裁掉的方格，读出静默区真正罩住的范围。点绑在场地效果上，随它生灭。
WorldCombatClient.scene("world_combat:move_magicroom_grid", 1, function (frame) {
    const entry: CombatSceneEntry<{ radius: number; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {} as any;
    const radius = Math.max(1, Number(data.radius) || (Number(data.scale) || 1) * 3.4);
    const x = entry.position[0], y = entry.position[1] + 0.06, z = entry.position[2];
    const spacing = Math.max(0.8, radius / 2.5), steps = Math.floor(radius / spacing);
    const color = 0x55C8D0E0;
    for (let i = -steps; i <= steps; i++) {
        const offset = i * spacing, chord = Math.sqrt(Math.max(0, radius * radius - offset * offset));
        if (chord <= 0.05) continue;
        frame.line(x + offset, y, z - chord, x + offset, y, z + chord, color);
        frame.line(x - chord, y, z + offset, x + chord, y, z + offset, color);
    }
});

// 熄灭符纹：每件真正被压制的装备画一枚暗面冷边的符纹，绕身体一圈；数量随装备变化，离圈时投影结束即消失。
WorldCombatClient.scene("world_combat:move_magicroom_seal", 1, function (frame) {
    const entry: CombatSceneEntry<{ count: number; target: string; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {} as any;
    const count = Math.max(0, Math.round(Number(data.count) || 0));
    if (count <= 0) return;
    const scale = Math.max(0.5, Math.min(2, Number(data.scale) || 1));
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4;
    const anchor = JSON.parse(frame.anchor(data.target));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.6, anchor.height); }
    const radius = Math.max(0.35, Math.min(1.1, scale * 0.55));
    const size = Math.max(0.012, Math.min(0.045, 0.022 * scale));
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
        frame.billboard(px, y + height * 0.5, pz, size, function (surface) {
            surface.fill(-7, -7, 14, 14, 0xF05E6E80);
            surface.fill(-8, -8, 16, 2, 0xF0C8D0E0);
            surface.fill(-8, 6, 16, 2, 0xF0C8D0E0);
            surface.fill(-8, -8, 2, 16, 0xF0C8D0E0);
            surface.fill(6, -8, 2, 16, 0xF0C8D0E0);
        });
    }
});
