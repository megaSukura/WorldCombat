/**
 * 蹭蹭脸颊 / nuzzle 的客户端表现。
 *
 * 一句话：施法者蹲下、两侧脸颊各噼啪攒起一串小电点，随后朝锁定方向小步扑过去、只拖一条短短的电尾，
 *   真正碰到身体的一刻在接触处炸开一小片电花；扑空只留一下落空的电点。
 * 色相家族：电黄（0xFFE96A）与暖白（0xFFF6C8）为主，浅青绿（0xC8F0A0）只做地面环的细节。整体偏暖、偏小，
 *   与同族那些大电击区分开——它是「小只动物蹭一下」的量级。
 * 拍子：起（cheek 攒电，`move_nuzzle_cheeks` 双颊贴真实朝向）→ 扑（lunge 电尾）→ 蹭（touch 缠身）→ 收（whiff 落空 / 各层淡出）。
 * 范围：touch 绑在目标身上，形状按身体缩放；接触半径由机制决定，画面就是贴在它身上的那簇电花。
 * 运动：没有飞行物——攒电在原地、扑击是施法者自己的位移、命中贴脸炸开，一眼看出这是接触招。
 * 数：`data.sparks`（由威力派生）绑定普通接触火星数，`data.numbing`（仅施麻成功非零）绑定麻痹符号数，
 *   `data.arcs`（由特攻派生）绑定攒电脉冲与环的条数，`data.intensity`（由威力派生）抬高亮度，`data.scale` 跟随接触半径缩放尺寸。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const NuzzleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        lunge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "pounce", bind: "source", height: 0.2, trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 34, shape: { kind: "sphere", radius: 0.15 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [4, 8], size: [0.09, 0.02],
                    color: 0xFFE96A, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.02, 0.07],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [7, 12], size: [0.05, 0.01],
                    color: 0x9C8455, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        touch: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.18], spread: 18,
                    lifetime: [4, 9], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 30
                },
                {
                    name: "cling", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "numbing", fallback: 0 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xFFE96A, alpha: [0.9, 0], light: "full", maxParticles: 44
                },
                {
                    name: "contact", bind: "target", offset: [0, 0.32, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "arcs", fallback: 4 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [5, 10], size: [0.06, 0.01],
                    color: 0xFFF6C8, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xFFE96A, alpha: [0.55, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nuzzle", 1, NuzzleDefinition);

/**
 * 双颊：按 `frame.anchor(source)` 的真实身体朝向逐帧摆放，转身时两颊跟着前方走（不再用固定世界轴偏移）。
 * 固定数量（每侧一个亮点，加两侧共 4 条短电弧），不生成粒子或实体；`data.arcs` 只用来调亮度/尺寸。
 */
const NuzzleCheekTexture = "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";
WorldCombatClient.scene("world_combat:move_nuzzle_cheeks", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle || data.moment !== "cheek") return;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (!anchor) return;
    const yaw = (Number(anchor.yaw) || 0) * Math.PI / 180;
    const forward = [-Math.sin(yaw), 0, Math.cos(yaw)];
    const right = [Math.cos(yaw), 0, Math.sin(yaw)];
    const width = Number(anchor.width) > 0 ? Number(anchor.width) : 0.9;
    const height = Number(anchor.height) > 0 ? Number(anchor.height) : 1.4;
    const scale = Math.max(0.6, Math.min(1.8, Number(data.scale) || 1));
    const arcs = Math.max(3, Math.min(10, Math.round(Number(data.arcs) || 4)));
    const start = Number(data.start) || frame.serverTick();
    const age = Math.max(0, frame.serverTick() - start);
    const pulse = 0.5 + 0.5 * Math.sin(age * 0.7);
    const alpha = Math.round(130 + 100 * pulse);
    const colour = (alpha << 24 | 0xFFF6C8) | 0;
    const face = width * 0.42 + 0.04, side = width * 0.4;
    const cx = Number(anchor.x), cy = Number(anchor.y) + height * 0.56, cz = Number(anchor.z);
    const size = (0.12 + 0.05 * pulse + 0.005 * arcs) * scale;
    for (let s = -1; s <= 1; s += 2) {
        const px = cx + forward[0] * face + right[0] * side * s;
        const pz = cz + forward[2] * face + right[2] * side * s;
        frame.sprite(NuzzleCheekTexture, px, cy, pz, size, 0, colour, 0, true);
        for (let i = 0; i < 2; i++) {
            const a = -0.5 + i;
            frame.line(px, cy, pz, px + right[0] * a * 0.08, cy + (0.03 + 0.04 * pulse) * (i === 0 ? 1 : -1), pz + right[2] * a * 0.08,
                (Math.round(150 * pulse) << 24 | 0xFFE96A) | 0);
        }
    }
});
