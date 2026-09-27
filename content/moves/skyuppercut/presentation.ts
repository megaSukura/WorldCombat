/**
 * 冲天拳 / skyuppercut 的客户端表现。
 *
 * 一句话：蹲身把拳收到腰下、脚下蹬起一圈尘，随后一枚拳尖贴着身前一条竖直的弧由低到高挑上去；弧扫到哪，
 * 哪就有格斗冲击，被顶中的目标带着一串上冲的气流离开地面，再按重力落回。基础命中始终有一下接触回执，
 * 只有真的被顶起才额外出现上冲气流。
 * 色相家族：暖琥珀（0xFFC06A）作主体、暖白（0xFFF4DC）作强调、红棕（0xD8843A）作细节；中性尘屑收尾。
 * 拍子：起 wind（收拳蓄劲）→ 击 rise（每刻真实子段）与 hit（每次命中接触）→ 上抛 launch（真的顶起才播）→
 *   收 hang（空中命中强调）／whiff（挑空）。
 * 范围：rise 的每个子段用 `data.path`（与服务端同一组端点）画出来，`move_skyuppercut_head` 再按 `data.tip`
 *   画一枚沿弧上挑的拳尖，玩家一眼看出这条弧扫到哪、拳尖此刻在哪。
 * 运动：拳尖沿 `data.from`→`data.tip` 前进并逐段抬高；被顶起的目标气流向上、尘屑带重力落下。
 * 数：弧粒子量绑 `data.sparks`（物攻换算），命中强度绑 `data.intensity`，高度/尺寸绑 `data.scale`。
 */
const SkyuppercutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: 12,
            exit: { stop: 6, drain: 9 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, -0.18, 0.16], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xFFF4DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "press", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xD8843A, alpha: [0.5, 0], gravity: 0.03, drag: 0.94, light: "world", maxParticles: 26
                },
                {
                    // 起势脚下蹬劲：只在整招开始时喷一次，不随每刻子段重复。
                    name: "soil", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 11, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xD8843A, alpha: [0.5, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        rise: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "sparks", fallback: 12 } },
                    direction: "shape", orient: "direction", speed: [0.1, 0.3], spread: 12,
                    lifetime: [5, 9], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "fist", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    shape: { kind: "polyline" }, burst: { count: { data: "sparks", fallback: 12 } },
                    direction: "shape", orient: "direction", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFF4DC, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        hit: {
            // 基础命中：无论有没有顶起来，只要伤害结算成功就有这一下接触回执。
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "contact", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "shape", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "chip", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spread: 24,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFC06A, alpha: [0.7, 0], gravity: 0.04, light: "world", maxParticles: 40
                }
            ]
        },
        launch: {
            // 上抛：只在真的顶起/推出去时播放，是 hit 之外的额外上升纹。
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "toss", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.8, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xD8843A, alpha: [0.55, 0], gravity: 0.06, drag: 0.94, light: "world", maxParticles: 34
                }
            ]
        },
        hang: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    // 空中命中的上冲强调：气流向上抽离，不画停留环、不暗示目标被强制悬停。
                    name: "riseAir", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 10, interval: 2, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.24, length: 0.9 },
                    direction: "up", speed: [0.12, 0.3],
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFF4DC, alpha: [0.7, 0], light: "world", maxParticles: 32
                },
                {
                    name: "motes", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [7, 13], size: [0.12, 0.03],
                    color: 0xFFF4DC, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 14, interval: 2, repeats: 2 },
                    shape: { kind: "cone", radius: 0.4, angleDegrees: 30, rotation: [0, 0, 0] },
                    direction: "up", speed: [0.1, 0.26],
                    lifetime: [6, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFC06A, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skyuppercut", 1, SkyuppercutDefinition);

/**
 * 真实拳尖：服务端每刻把当前子段端点传进来，客户端固定画一枚沿弧上挑的拳尖（同 key 更新），
 * 读得出「一枚拳尖顺真实弧运动」而不是整段随机撒贴图。端点与判定共用；实际命中仍由服务端的 hit 回执驱动。
 */
const SkyuppercutHeadFist = "cobblemon:particle/generic/bigfist";
const SkyuppercutHeadKnuckle = "cobblemon:particle/generic/fist";

function skyuppercutNumberAt(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

function skyuppercutVecAt(value: any, fallback: number[] | null): number[] | null {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

WorldCombatClient.scene("world_combat:move_skyuppercut_head", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const tip = skyuppercutVecAt(data.tip, null);
    const from = skyuppercutVecAt(data.from, tip);
    if (!tip || !from) return;
    const scale = Math.max(0.5, Math.min(1.8, skyuppercutNumberAt(data.scale, 1)));
    const tick = frame.serverTick();
    frame.line(from[0], from[1], from[2], tip[0], tip[1], tip[2], 0x99FFC06A | 0);
    const beads = 3;
    for (let i = 0; i < beads; i++) {
        const t = beads <= 1 ? 1 : i / (beads - 1);
        const px = from[0] + (tip[0] - from[0]) * t;
        const py = from[1] + (tip[1] - from[1]) * t;
        const pz = from[2] + (tip[2] - from[2]) * t;
        const texture = i === beads - 1 ? SkyuppercutHeadFist : SkyuppercutHeadKnuckle;
        const frameCount = i === beads - 1 ? 9 : 5;
        frame.sprite(texture, px, py, pz, (0.18 + 0.08 * t) * scale, 0,
            i === beads - 1 ? 0xFFFFF4DC | 0 : 0xCCFFC06A | 0,
            Math.floor(tick / 2 + i) % frameCount, true);
    }
});
