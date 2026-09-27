/**
 * 净化 / Purify 的粒子语言。
 *
 * 一句话：手心先拢起一点净光，并预告这次会抽到谁（windup）→ 施法者朝目标探手，目标身上的病痛被抽出、
 *   沿一条暗紫的线真实下落到施法者口边（draw，自定义场景）→ 只有真正抽到东西，暗雾才在施法者身上落地，
 *   化作一圈薄荷色的回血光（absorb）。
 * 色相家族：薄荷 0x9CE8C8 作主体，近白 0xEAFFF6 作高光，被抽出的病痛用低饱和暗紫 0x7A5FA0 画小面积。
 * 拍子：起 windup 0–12t ／ 引 draw（目标身上收雾 + 自定义场景的返回流动）／ 收 absorb 0–32t；落空时用 fizzle 收。
 * 范围：`world_combat:move_purify_flow` 用服务端给出的两个真实世界点（目标头顶→施法者口边）逐刻画返回雾，
 *   不再用 polyline 在整段上随机撒点假装返回；windup 的预告线仍绑 path（施法者↔预定对象），只有 data.preview 为 1 时出现。
 * 数：返回雾的流动数与 absorb 的回血光量绑 data.motes，抽出病痛数绑 data.removed（抽掉的项数），
 *   absorb 的强度以 data.intensity（由实际补回的生命派生）缩放。
 */
const PurifyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 18, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xEAFFF6, alpha: [0.85, 0], light: "full", maxParticles: 30
                },
                {
                    // 预告这次会抽到谁：path 只在 data.preview 为 1 时由服务端填入。
                    name: "gather_thread", bind: "path", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 22, shape: { kind: "polyline" },
                    speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9CE8C8, alpha: [0.6, 0], light: "full", maxParticles: 36
                },
                {
                    name: "gather_mark", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 3, repeats: 3 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.2, 0.05], alphaMode: "sin",
                    color: 0xEAFFF6, alpha: [0.55, 0], light: "full", maxParticles: 12
                }
            ]
        },
        draw: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    // 抽出当刻在目标身上收拢一下病痛之雾；返回流动由自定义场景 move_purify_flow 画。
                    name: "draw_pull", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: { data: "removed", fallback: 1 }, interval: 2, repeats: 7 }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x7A5FA0, alpha: [0.7, 0], light: "world", maxParticles: 36
                }
            ]
        },
        absorb: {
            duration: 32,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "absorb_burst", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x9CE8C8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "absorb_ring", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.28, 0.7], sizeMode: "sin",
                    color: 0xEAFFF6, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "absorb_mote", bind: "source", offset: [0, 0.35, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xEAFFF6, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "point", offset: [0, 0.4, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0x7A5FA0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_purify", 1, PurifyDefinition);

const PurifyFlowOrb = "cobblemon:particle/generic/orb/smallfadeorb";
const PurifyFlowSpark = "cobblemon:particle/generic/sparkle/glowingsparkle";

function purifyFlowNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function purifyFlowPoint(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}

/**
 * 返回雾：服务端给出目标头顶与施法者口边两个真实世界点和出手刻，客户端按 serverTick 让几缕暗紫的病痛之雾
 * 沿这条线真实下落到口边。固定数量贴图，没有粒子生灭或额外实体；流动数读 data.motes（特防与体型派生），
 * 尺寸读 data.scale。这样「抽走病痛、带病痛回身」是看得见的位移，而不是整段同时亮起。
 */
WorldCombatClient.scene("world_combat:move_purify_flow", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = data.path;
    if (!Array.isArray(path) || path.length < 2) return;
    const a = purifyFlowPoint(path[0]), b = purifyFlowPoint(path[1]);
    if (!a || !b) return;
    const start = purifyFlowNumber(data.start, frame.serverTick());
    const duration = Math.max(1, purifyFlowNumber(data.duration, 14));
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const scale = Math.max(0.6, Math.min(1.8, purifyFlowNumber(data.scale, 1)));
    const motes = Math.max(6, Math.min(40, purifyFlowNumber(data.motes, 18)));
    const strands = Math.max(3, Math.min(10, Math.round(motes / 3)));
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    // 整条抽取通道的暗紫细线，标出这一段路的真实两端。
    frame.line(a[0], a[1], a[2], b[0], b[1], b[2], (0x38 << 24 | 0x7A5FA0) | 0);
    for (let i = 0; i < strands; i++) {
        const lead = t - i * 0.07;
        if (lead <= 0) continue;
        const s = Math.max(0, Math.min(1, lead));
        const arc = Math.sin(s * Math.PI) * 0.16;
        frame.sprite(PurifyFlowOrb, a[0] + dx * s, a[1] + dy * s + arc, a[2] + dz * s,
            (0.1 + 0.02 * (i % 3)) * scale, 0, 0xE87A5FA0 | 0, 0, false);
    }
    if (t > 0.82) frame.sprite(PurifyFlowSpark, b[0], b[1], b[2], 0.22 * scale, 0, 0xFF9CE8C8 | 0, 0, true);
});
