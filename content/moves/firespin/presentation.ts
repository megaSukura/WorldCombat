/**
 * 火焰旋涡 / firespin 的客户端表现。
 *
 * 一句话：施法者掌心先卷起一撮回旋的火舌，随后火种追着目标飞去，命中的地方腾起一道绕着目标打转、跟着它走的火柱；
 * 火柱不断往目标身上舔火、把地面烤出焦痕；目标湿透时火柱「嗤」地化成一团白汽熄灭。
 * 色相家族：橙红（0xE86A2A）为主、亮黄（0xFFD060）做火舌高光、近白（0xFFF0C0）只在中心；焦痕用暗褐。
 * 拍子：起（charge 聚火）→ 掷（cast 火种）→ 驻（wrap 立柱 / column 回旋 / lick 舔火）→ 收（release / douse）；碰墙走 scatter。
 * 范围：持续火柱由自定义场景 world_combat:move_firespin/column 逐帧绕目标重画——目标是活体，用 frame.anchor 读
 *   它插值后的脚底位置与身高，radius／height 直接是 world 方块单位，只缩一次；地面焦痕只在服务端确认有真实支撑时落下。
 * 运动：火柱由相位随 serverTick 推进的螺旋采样组成，每枚火舌带着切向短迹逐刻绕体上升——是真的绕身旋转，不是原地抖纹理；
 *   体侧另有一圈贴身的火，说明柱是包着目标而非独立圆柱。lick 只在服务端确认这一下真的造成伤害时才短亮，未命中不出现。
 * 数：`data.flow`（火柱半径派生）决定螺旋采样数，`data.pulses`（已舔次数）让火柱越烧越旺；数量保留在内部，玩家不可见。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const FirespinDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0xE86A2A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "embers", bind: "source", offset: [0, 0.45, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cast: {
            duration: 46,
            exit: { stop: 28, drain: 14 },
            emitters: [
                {
                    name: "seed", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 40, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 12, trail: { minDistance: 0.22 },
                    lifetime: [7, 12], size: [0.18, 0.04],
                    color: 0xE86A2A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 150
                },
                {
                    name: "sparks", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 2, interval: 1, repeats: 14 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09], spread: 24,
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        wrap: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flare", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.07, 0.24], spread: 18,
                    lifetime: [7, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                }
            ]
        },
        lick: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 18,
                    lifetime: [6, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "subside", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.14],
                    gravity: -0.003, drag: 0.94,
                    lifetime: [12, 20], size: [0.22, 0.04],
                    color: 0xB98A6A, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "embers", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.06, drag: 0.91,
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0xFFB060, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        douse: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "steam", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 26 },
                    shape: { kind: "cylinder", radius: 0.4, length: 1.4 },
                    direction: "up", speed: [0.03, 0.14],
                    gravity: -0.004, drag: 0.93,
                    lifetime: [12, 22], size: [0.26, 0.05],
                    color: 0xE8E8E8, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xB98A6A, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        scatter: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "sparks", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [6, 11], size: [0.08, 0.01],
                    color: 0xFFD060, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firespin", 1, FirespinDefinition);

/**
 * 持续火柱：逐帧按目标真实身体重画一圈相位推进的绕体螺旋。
 * 位置来自 frame.anchor(data.target) 的插值脚底/身高，所以目标移动、换体型时火柱跟着走；
 * radius／height 已经是 world 方块单位，直接用一次。地面焦痕只在服务端确认有真实支撑（data.ground）时落下，
 * 空中只包体。每帧固定采样数，数量不对外显示。
 */
const FirespinColumnScene = "world_combat:move_firespin/column";
const FirespinFlameSprite = "cobblemon:particle/generic/fire/flame";
const FirespinWispSprite = "cobblemon:particle/generic/fire/wisp";
const FirespinScorchSprite = "cobblemon:particle/generic/scorch/floorscorch";

function firespinColumnNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function firespinColumnGround(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}

WorldCombatClient.scene(FirespinColumnScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const target = typeof data.target === "string" ? data.target : "";
    if (!target) return;
    const anchorJson = frame.anchor(target);
    const anchor: any = anchorJson ? JSON.parse(anchorJson) : null;
    if (!anchor) return;
    const cx = Number(anchor.x), feet = Number(anchor.y), cz = Number(anchor.z);
    if (!isFinite(cx) || !isFinite(feet) || !isFinite(cz)) return;
    const radius = Math.max(0.4, Math.min(2.6, firespinColumnNumber(data.radius, 0.85)));
    const height = Math.max(1.0, Math.min(4.6, firespinColumnNumber(data.height, 2.2)));
    const bodyHeight = Math.max(0.6, Math.min(3.2, firespinColumnNumber(anchor.height, height)));
    const flow = Math.max(12, Math.min(160, firespinColumnNumber(data.flow, 60)));
    const pulses = Math.max(0, Math.round(firespinColumnNumber(data.pulses, 0)));
    const segments = Math.max(6, Math.min(18, Math.round(flow / 8)));
    const t = frame.serverTick();
    const phase = t * 0.16;
    const rise = (t * 0.09) % 1;
    const frameIndex = Math.floor(t * 0.5);
    const ember = ((200 + Math.min(55, pulses * 4)) << 24 | 0xE86A2A) | 0;
    const tongue = ((205 + Math.min(50, pulses * 4)) << 24 | 0xFFD060) | 0;
    const streak = (150 << 24 | 0xE86A2A) | 0;
    for (let i = 0; i < segments; i++) {
        const angle = phase + i * (Math.PI * 2 / segments);
        const y = feet - 0.1 + (((i / segments) + rise) % 1) * height;
        const x = cx + Math.cos(angle) * radius;
        const z = cz + Math.sin(angle) * radius;
        const prev = angle - 0.55;
        frame.line(cx + Math.cos(prev) * radius, y, cz + Math.sin(prev) * radius, x, y, z, streak);
        frame.sprite(i % 2 === 0 ? FirespinFlameSprite : FirespinWispSprite, x, y, z,
            Math.max(0.12, Math.min(0.42, radius * 0.42)), -((angle * 180) / Math.PI) % 360,
            i % 2 === 0 ? ember : tongue, frameIndex, true);
    }
    const ringSegments = Math.max(4, Math.floor(segments / 2));
    for (let j = 0; j < ringSegments; j++) {
        const angle = phase * 1.4 + j * (Math.PI * 2 / ringSegments);
        frame.sprite(FirespinFlameSprite, cx + Math.cos(angle) * radius * 0.72, feet + bodyHeight * 0.45,
            cz + Math.sin(angle) * radius * 0.72, Math.max(0.1, Math.min(0.32, radius * 0.32)),
            -((angle * 180) / Math.PI) % 360, ember, frameIndex, true);
    }
    const ground = firespinColumnGround(data.ground);
    if (ground !== null && ground[1] <= feet + 0.7) {
        frame.sprite(FirespinScorchSprite, ground[0], ground[1] + 0.02, ground[2],
            Math.max(0.6, Math.min(2.2, radius * 1.6)), 0, (150 << 24 | 0x4A3226) | 0, 0, false);
    }
});
