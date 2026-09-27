/**
 * 奇妙空间 的粒子语言与交换图符（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下荡开一圈淡青的交换波纹，撑起一片两半边反向旋转的空间；谁走进去，
 * 两枚不同的防御图符真的上下换位——物防符号与特防符号互换高度；走出去再换回来，空间走完同时归位。
 *
 * 色相家族：交换青（0x8FE8D8）为主体，近白（0xD8FFF4）做高光，青灰（0x5FBFAE）做地面影与余韵。
 * 一个效果一个色相家族。持续层是贴地的边界环，低密度、低高度，让出目标本体视线。
 * 层次：预转（起手）／边界环＋两半（撑开）／贴地边界（持续）／图符对调（事件，真实换位）／经过（不支持交换）／归位与收。
 * 数：撑开与持续的粒子量绑定服务端算出的 data.density；边界半径绑定 data.scale（机制半径／定义半径）；
 *   图符交换由自定义场景按 data.start/duration 逐帧画出，交错光点数同样读 data.density。
 */
const WonderroomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "turn_a", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "shape", speed: [0.03, 0.08], spin: 12,
                    lifetime: [16, 26], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xD8FFF4, alpha: [0.7, 0], light: "full", maxParticles: 24
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
                    burst: { count: 36 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.36, 0.16],
                    color: 0xD8FFF4, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "open_half_light", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: { data: "density", fallback: 22 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "shape", speed: [0.04, 0.14], drag: 0.9, spin: 16,
                    lifetime: [18, 30], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x8FE8D8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "open_dust", bind: "point", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x5FBFAE, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        inside: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 6, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9, spin: -8,
                    lifetime: [20, 34], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x8FE8D8, alpha: [0.28, 0], alphaMode: "sin", light: "full", maxParticles: 40
                },
                {
                    name: "edge_dots", bind: "point", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "density", fallback: 22 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [18, 30], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xD8FFF4, alpha: [0.22, 0], light: "full", maxParticles: 30
                }
            ]
        },
        pass: {
            duration: 14,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "edge_pass", bind: "target", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.95,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x5FBFAE, alpha: [0.25, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wonderroom", 1, WonderroomDefinition);

function wonderroomExchangeColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

// 两枚不同的防御图符真实换位：物防符号（护板）从高到低、特防符号（护咒）从低到高，
// 逐帧按 data.start/duration 插值；离场 reverse 时反向换回。位置读目标真实脚点与体型。
WorldCombatClient.scene("world_combat:move_wonderroom_exchange", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const anchor = data.target ? JSON.parse(frame.anchor(String(data.target))) : null;
    const x = anchor ? Number(anchor.x) : entry.position[0];
    const feet = anchor ? Number(anchor.y) : entry.position[1];
    const z = anchor ? Number(anchor.z) : entry.position[2];
    const height = anchor ? Math.max(0.9, Number(anchor.height) || 1.3) : 1.3;
    const now = frame.serverTick() + frame.partialTick();
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const duration = Math.max(8, Number(data.duration) || 20);
    const age = now - start;
    if (age < -2 || age > duration + 3) return;
    const progress = Math.max(0, Math.min(1, age / duration));
    const reverse = data.reverse === true;
    const fade = age > duration - 5 ? Math.max(0, (duration - age) / 5) : 1;
    const iconHeight = Math.max(0.36, height * 0.4);
    const top = feet + height * 0.92, bottom = feet + height * 0.3;
    // 物防符号走 上↔下，特防符号反向，真正互换高度；离场时反向回到原位。
    const defY = reverse ? bottom + (top - bottom) * progress : top - (top - bottom) * progress;
    const spdY = reverse ? top - (top - bottom) * progress : bottom + (top - bottom) * progress;
    const spriteFrame = Math.floor(now * 0.4) % 8;
    frame.sprite("cobblemon:particle/moves/protect_block", x, defY, z, iconHeight, 0,
        wonderroomExchangeColour(0.95 * fade, 0x8FE8D8), spriteFrame, true);
    frame.sprite("cobblemon:particle/generic/psychic/psyswirl", x, spdY, z, iconHeight, 0,
        wonderroomExchangeColour(0.95 * fade, 0xD8FFF4), spriteFrame, true);
    // 交错光点：数量由本场机制密度驱动，在两枚图符之间来回。
    const count = Math.max(4, Math.min(16, Math.round(Number(data.density) || 12) / 2));
    for (let i = 0; i < count; i++) {
        const lane = count <= 1 ? 0 : (i / (count - 1) - 0.5) * 0.32;
        const laneProgress = (progress + i * 0.07) % 1;
        const y = bottom + (top - bottom) * laneProgress;
        frame.sprite("cobblemon:particle/generic/orb/xsfadeorblite", x + lane, y, z + lane * 0.4,
            Math.max(0.06, iconHeight * 0.22), 0, wonderroomExchangeColour(0.7 * fade, 0xD8FFF4),
            Math.floor(now * 0.5 + i) % 7, true);
    }
});
