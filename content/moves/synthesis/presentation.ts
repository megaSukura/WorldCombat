/**
 * 光合作用 / Synthesis 的粒子语言。
 *
 * 一句话：叶片从脚边收拢、向上摊开，四片叶位在整段光合里逐片收亮，每次真的回了血才有一颗绿光收进身体；
 *   日照越足叶阵越大越亮，被打断时叶片向内合拢。
 * 色相家族：叶绿 0x8FCF6E 作主体，日光金 0xFFE08A 作高光，暖白 0xFFF6D8 只作顶部光幕。
 * 拍子：起（windup）／持续（soak）／脉（vein，金色内收高光）／入体（mote，仅真实回复）／合（close，被打断）。
 * 四片叶位是独立的自定义客户端场景（move_synthesis_leaves）：固定数量图形贴身体四方位，data.lit 逐片收亮、
 *   当前这一拍高亮，不生成粒子，随动作结束/打断一起收，因此叶子始终稳定可数而不是一簇飞散的叶粒子。
 * 范围：作用于自己，绑 source（fit body）；叶环贴脚边，光幕在头顶，玩家看得出这是一招自我回复。
 * 机制驱动：vein 的高光数与 mote 的绿光尺寸分别绑定 data.motes / data.moteSize（由日照与实际回复算出）；
 *   整体尺寸随 data.scale 变化。
 */
const SynthesisDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "leaf_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 16, shape: { kind: "circle", radius: 0.9 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "full", maxParticles: 44
                },
                {
                    name: "sun_hint", bind: "source", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "light", fallback: 0 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        soak: {
            duration: 0,
            exit: { stop: 2, drain: 10 },
            emitters: [
                {
                    name: "leaf_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "circle", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "full", maxParticles: 48
                },
                {
                    name: "canopy", bind: "source", offset: [0, 0.95, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 7, shape: { kind: "hemisphere", radius: 0.8 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [16, 28], size: [0.22, 0.06],
                    color: 0xFFF6D8, alpha: [{ data: "light", fallback: 0.2 }, 0], light: "full", maxParticles: 26
                }
            ]
        },
        vein: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vein_glow", bind: "source", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 5 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFE08A, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        mote: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "green_mote", bind: "source", offset: [0, 0.85, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "inward", speed: [0.08, 0.16],
                    lifetime: [12, 18], size: [{ data: "moteSize", fallback: 0.12 }, 0.03],
                    color: 0x8FCF6E, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 4
                },
                {
                    name: "mote_trail", bind: "source", offset: [0, 0.85, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.03, 0.10],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xFFF6D8, alpha: [0.8, 0], light: "full", maxParticles: 12
                }
            ]
        },
        close: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "leaf_close", bind: "source", offset: [0, 0.35, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8FCF6E, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_synthesis", 1, SynthesisDefinition);

/**
 * 稳定叶阵（自定义客户端场景，不生成粒子或实体）：四片真实叶位贴在施术者身体四角，data.lit 逐片收亮，
 * 最近进账的一片高亮，日照 data.light 决定整体大小与亮度。随动作的 leaves 场景结束/打断一起收，不留残留。
 */
const SynthesisLeafTexture = "cobblemon:particle/generic/grass/leaf";

function synthesisLeafValue(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function synthesisLeafColour(alpha: number, rgb: number): number {
    return ((Math.round(255 * Math.max(0, Math.min(1, alpha))) << 24) | rgb) | 0;
}

WorldCombatClient.scene("world_combat:move_synthesis_leaves", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const ref = String(data.target || "");
    const raw = ref ? frame.anchor(ref) : null;
    const anchor = raw ? JSON.parse(raw) : null;
    const fallback = entry.position || [0, 0, 0];
    const width = Math.max(0.3, synthesisLeafValue(anchor && anchor.width, 0.9));
    const height = Math.max(0.4, synthesisLeafValue(anchor && anchor.height, 1.4));
    const cx = anchor ? anchor.x : fallback[0], cy = anchor ? anchor.y : fallback[1], cz = anchor ? anchor.z : fallback[2];
    const lit = Math.max(0, Math.min(4, Math.round(synthesisLeafValue(data.lit, 0))));
    const light = Math.max(0, Math.min(1, synthesisLeafValue(data.light, 0.5)));
    const radius = width * 0.55 + 0.18, leafHeight = cy + height * (0.22 + 0.10 * light);
    for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4;
        const on = i < lit, current = on && i === lit - 1;
        const alpha = (on ? (current ? 1 : 0.78) : 0.3) * (0.55 + 0.45 * light);
        const size = (on ? (current ? 0.2 : 0.155) : 0.1) * (0.85 + 0.35 * light);
        frame.sprite(SynthesisLeafTexture, cx + Math.cos(angle) * radius, leafHeight, cz + Math.sin(angle) * radius,
            size, -angle * 57.2958, synthesisLeafColour(alpha, 0x8FCF6E), i % 4, on);
    }
    frame.sprite("cobblemon:particle/generic/sparkle/glowingsparkle_yellow", cx, leafHeight + 0.28, cz,
        0.09 + 0.06 * light, 0, synthesisLeafColour(0.5 + 0.4 * light, 0xFFE08A), 0, true);
});
