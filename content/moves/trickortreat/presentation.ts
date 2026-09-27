/**
 * 万圣夜 的粒子语言与自定义轮廓。
 *
 * 一句话：施法者抖开一件南瓜色的斗篷盖到目标身上，壳上炸开一圈橙黄火花与糖果彩片；
 *   外壳期间它身上一直有一张可辨的鬼面与外衣轮廓、以有限火点作边饰，直到壳被剥落。
 *
 * 色相家族：南瓜橙（0xE88A3C）做外壳主体，糖果黄（0xF7D02C）做火花与彩片，幽灵紫（0x735797）做壳里的烟雾。
 * 层次：招呼（起手，斗篷在施法者身上展开）→ 披壳（橙色火花＋糖果彩片，鬼面／外衣轮廓由自定义场景成形）
 *   → 持壳（自定义场景逐帧画着鬼面轮廓＋火点；粒子只补低密度火星与蓝雾）→ 剥落／被挡／拒绝／落空。
 * 起击收：windup（招呼）→ dress（披壳）→ hold（持壳，随记录层结束）→ tear（剥落）。
 * 范围：单体套壳，外壳、火花与鬼面画的正是被套住的那个人；套壳距离由 reach 决定。
 * 运动：衣线只在有真实连线时由自定义场景从施法者一瞬展开到目标（不是沿线飞行的粒子前沿）；
 *   火花向外炸开；持壳时火点贴着它上浮。
 * 数：装饰点数读 data.motes（体重派生），外壳时长读 data.shell（决定外壳尺度）。
 */
const TrickortreatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "unfold_cloak", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE88A3C, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        dress: {
            duration: 34,
            exit: { stop: 18, drain: 22 },
            emitters: [
                {
                    name: "candy_burst", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30, gravity: 0.01,
                    lifetime: [14, 24], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xF7D02C, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shell_impact", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 4, interval: 3 }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0x735797, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "shell_ember", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "motes", fallback: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05], gravity: -0.002,
                    lifetime: [12, 20], size: [0.09, 0.02], alphaMode: "sin",
                    color: 0xE88A3C, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "shell_haze", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0x735797, alpha: [0.22, 0], light: "world", maxParticles: 20
                }
            ]
        },
        tear: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "tear_fall", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "away", speed: [0.03, 0.1], gravity: 0.012,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xE88A3C, alpha: [0.7, 0], light: "world", maxParticles: 28
                },
                {
                    name: "tear_dust", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_dust", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trickortreat", 1, TrickortreatDefinition);

/**
 * 鬼面／外衣轮廓：自定义场景读目标当前真实位置，逐帧画出一件可辨的幽灵外衣——
 * 鬼面在头部、外衣边线从头收到底、有限火点作边饰。持壳时随记录层一起存续，记录层一收就消失；
 * 衣线只在有真实施法者→目标连线时展开，没有 path 不发衣线，拒绝时也不会假造 dress。
 */
const TrickortreatGhostFace = "cobblemon:particle/moves/scaryface";
const TrickortreatGhostBody = "cobblemon:particle/generic/impact/impact_ghost";
const TrickortreatEmber = "cobblemon:particle/generic/fire/ember";

function trickortreatNumber(value: any, fallback: number): number {
    const result = Number(value); return isFinite(result) ? result : fallback;
}
function trickortreatArgb(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

WorldCombatClient.scene("world_combat:move_trickortreat_shell", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const anchor = JSON.parse(frame.anchor(String(data.target || entry.source)));
    if (!anchor) return;
    const now = frame.serverTick();
    const hold = data.moment === "hold";
    const start = trickortreatNumber(data.start, now);
    const duration = trickortreatNumber(data.duration, 0);
    const age = now - start;
    if (duration > 0 && (age < 0 || age > duration)) return;
    const fade = duration > 0 && age > duration - 8 ? Math.max(0, (duration - age) / 8) : 1;
    const scale = Math.max(0.5, Math.min(2.2, trickortreatNumber(data.scale, 1)));
    const motes = Math.max(0, Math.min(40, Math.round(trickortreatNumber(data.motes, 0))));
    const x = anchor.x, y = anchor.y, z = anchor.z;
    const height = Math.max(0.7, trickortreatNumber(anchor.height, 1.2));
    const head = y + height * 0.82, hem = y + 0.06;
    const half = Math.max(0.24, height * 0.26) * scale;
    const cloak = trickortreatArgb((hold ? 0.28 : 0.6) * fade, 0x735797);
    const face = trickortreatArgb((hold ? 0.5 : 0.9) * fade, 0xE88A3C);
    // 外衣本体与轮廓。
    frame.sprite(TrickortreatGhostBody, x, y + height * 0.45, z, 0.5 * scale, 0, cloak, 0, true);
    frame.line(x - half * 0.7, head, z, x - half, hem, z, cloak);
    frame.line(x + half * 0.7, head, z, x + half, hem, z, cloak);
    frame.line(x - half, hem, z, x + half, hem, z, cloak);
    // 鬼面（贴图始终朝向镜头）。
    frame.sprite(TrickortreatGhostFace, x, head, z, 0.34 * scale, 0, face, Math.floor(now * 0.2) % 5, true);
    // 有限火点作边饰。
    const trim = Math.max(4, Math.min(14, Math.round(motes * (hold ? 0.4 : 0.7))));
    for (let i = 0; i < trim; i++) {
        const edge = trim <= 1 ? 0 : (i / (trim - 1) - 0.5) * 2;
        const bob = 0.03 + 0.04 * Math.sin(now * 0.3 + i * 1.7);
        frame.sprite(TrickortreatEmber, x + edge * half, hem + bob, z, 0.1 * scale, 0,
            trickortreatArgb((0.5 + 0.3 * fade) * fade, 0xE88A3C), Math.floor(now * 0.4 + i) % 5, true);
    }
    // 有真实连线时才画施法者→目标的衣线；持壳阶段不发衣线。
    if (!hold && Array.isArray(data.path) && data.path.length >= 2) {
        const from = JSON.parse(frame.anchor(String(data.path[0])));
        const to = JSON.parse(frame.anchor(String(data.path[1])));
        if (from && to) {
            const travel = Math.max(0, Math.min(1, age / 10));
            frame.line(from.x, from.y + 0.9, from.z,
                from.x + (to.x - from.x) * travel, from.y + (to.y - from.y) * travel + 0.9, from.z + (to.z - from.z) * travel,
                trickortreatArgb(0.7 * fade, 0xE88A3C));
        }
    }
});
