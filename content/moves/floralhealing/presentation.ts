/**
 * 花疗 / Floral Healing 的粒子语言。
 *
 * 一句话：施法者手边拢起一束花，短程把花瓣真实送到伙伴身上；花苞在伙伴身上绽开，补到生命时才叠一层回复亮光，
 *   稍后第二朵在它**当下**脚下再开，站在青草场地上时第二朵更大更暖；对象中途失效就走 fade。
 * 色相家族：花瓣粉 0xE89AC0 作主体，暖白 0xFFE3F0 作回复高光，草绿 0x7CCB5A 作叶与落花，暖金 0xF2C14E 只作青草强调。
 * 拍子：起（windup）／送（scatter 源点撒出 + move_floralhealing_carry 沿真实连线短程送达）／附（attach 花苞绽开）／
 *   回（bloom 只在真的补到生命时出现）／收（fade）。
 * 送达：scatter 只从施法者手边撒出，实际横跨交给自定义场景 `move_floralhealing_carry`，它读服务端给的施法者/伙伴引用，
 *   每帧把花心放在两点之间当前真实位置的连线上（不是整条线一次撒满）。
 * 世界半径只缩放一次：bloom/attach 的花圈用 `fit: "none"`，几何半径是定义时的参考值，服务端把 `data.scale = 实际半径 / 参考` 传进来，
 *   引擎按它缩放形状与尺寸一次；不再同时对 `radius` 与 `scale` 缩放。
 * 机制驱动：attach 的花瓣、bloom 的回复亮点读 `data.petals`／`data.healDust`（由该朵实际回复量算出），
 *   第二朵在青草场地上 `data.petals` 更大、`data.gold`＞0 多一层暖金；尺寸读 `data.scale`。
 */
const FloralHealingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "petal_hand", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: { data: "petals", fallback: 18 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06], spin: 20,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xE89AC0, alpha: [0.8, 0], light: "full", maxParticles: 50
                },
                {
                    name: "hand_glow", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xFFE3F0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        scatter: {
            duration: 20,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "shed", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "petals", fallback: 18 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spin: 30,
                    lifetime: [8, 16], size: [0.12, 0.03],
                    color: 0xE89AC0, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "shedtrail", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "petals", fallback: 18 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.2], spin: 40,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        attach: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bud", bind: "target", fit: "none", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.25 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 20
                },
                {
                    name: "petals", bind: "target", fit: "none", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "petals", fallback: 18 } }, shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2], spin: 40, drag: 0.9,
                    lifetime: [12, 24], size: [0.14, 0.03],
                    color: 0xE89AC0, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "rain", bind: "target", fit: "none", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "flowers", fallback: 0 }, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.8 }, direction: "down", speed: [0.01, 0.05], spin: 20, gravity: 0.01,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x7CCB5A, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "open_ring", bind: "target", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "circle", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [14, 24], size: 0.3,
                    color: 0xE89AC0, alpha: [0.65, 0], light: "full", maxParticles: 16
                },
                {
                    name: "petal_burst", bind: "target", fit: "none", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "petals", fallback: 18 } }, shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2], spin: 40, drag: 0.9,
                    lifetime: [12, 24], size: [0.14, 0.03],
                    color: 0xE89AC0, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "flower_core", bind: "target", fit: "none", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.25 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 28], size: [0.28, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 20
                },
                {
                    name: "heal_sparkle", bind: "target", fit: "none", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "healDust", fallback: 16 } }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xFFE3F0, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "grass_gild", bind: "target", fit: "none", offset: [0, 0.5, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "gold", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xF2C14E, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wilt", bind: "source", fit: "none", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.01, 0.05], gravity: 0.02, spin: 20,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x7CCB5A, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_floralhealing", 1, FloralHealingDefinition);

/** 花瓣从施法者短程送到伙伴：每帧把花心放在两点当前真实位置的连线上，读得出花瓣确实从源头发出、走到伙伴身上。 */
const FloralhealingCarryLeaf = "cobblemon:particle/generic/grass/leaf";
const FloralhealingCarrySmall = "cobblemon:particle/generic/grass/smallleaf";

function floralhealingNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function floralhealingClamp(value: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, value)); }
function floralhealingVec(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n: any) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}
function floralhealingColour(alpha: number, rgb: number): number { return ((Math.round(255 * floralhealingClamp(alpha, 0, 1)) << 24) | rgb) | 0; }

WorldCombatClient.scene("world_combat:move_floralhealing_carry", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (!data || data.lifecycle) return;
    const source = JSON.parse(frame.anchor(entry.source));
    const mate = data.target ? JSON.parse(frame.anchor(String(data.target))) : null;
    const from = floralhealingVec(data.from, source ? [source.x, source.y, source.z] : null);
    const to = floralhealingVec(data.to, mate ? [mate.x, mate.y, mate.z] : null);
    if (!from || !to) return;
    const travel = Math.max(1, floralhealingNumber(data.travel, 5));
    const start = floralhealingNumber(data.start, frame.serverTick());
    const age = frame.serverTick() - start;
    const progress = floralhealingClamp(age / travel, 0, 1);
    const fadeIn = floralhealingClamp((age + 1) / 3, 0, 1);
    const petalColour = floralhealingColour(0.85 * fadeIn, 0xE89AC0);
    const leafColour = floralhealingColour(0.7 * fadeIn, 0x7CCB5A);
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
    const head = [from[0] + dx * progress, from[1] + dy * progress, from[2] + dz * progress];
    frame.line(from[0], from[1], from[2], head[0], head[1], head[2], petalColour);
    const petals = floralhealingClamp(Math.round(floralhealingNumber(data.petals, 18) / 3), 4, 18);
    for (let i = 0; i < petals; i++) {
        const t = (i + 0.5) / petals * progress;
        const wobble = Math.sin(age * 0.6 + i * 1.7) * 0.06;
        frame.sprite(i % 2 === 0 ? FloralhealingCarryLeaf : FloralhealingCarrySmall,
            from[0] + dx * t + wobble, from[1] + dy * t + Math.cos(age * 0.5 + i) * 0.05, from[2] + dz * t - wobble,
            0.08 + (i / petals) * 0.03, 0, i % 2 === 0 ? petalColour : leafColour, i % 4, true);
    }
    frame.sprite(FloralhealingCarryLeaf, head[0], head[1], head[2], 0.13, 0, petalColour, 0, true);
});
