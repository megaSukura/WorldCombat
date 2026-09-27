/**
 * 棉花防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者身上先聚起一小团棉絮、再鼓成一层贴身的白绒；近战打上来时受击一侧的绒被压低后弹散，
 *   把打击者轻轻弹开；绒被磨光或到期时绒毛簌簌落下。
 *
 * 色相家族：棉白（0xF6F3EA）为主体，暖米（0xE4D6C4）作烟，浅粉棕（0xE9C9B8）只做细节小点。没有第二个色相。
 * 起击收：bloom（聚絮）→ wrap（裹上）→ crush（受击弹散）→ bare（撕光）。
 * 贴身绒层不用大光圈冒充：固定少量绒团由 custom scene `world_combat:move_cottonguard_layers` 按 data.layers 逐帧画在身上。
 * 运动：绒团由体内向外散、贴地飘；受击一侧在服务端算出的贴身处压瘪再弹出（bind:point 用该点、orient 用 data.direction）；
 *   被撕光时受重力落下；贴身绒层的缺口按 data.direction 落在受击方位。
 * 数：绒团量绑 data.fluff（体重派生），受击弹散量绑 data.layers（剩余层数）。
 */
const CottonGuardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bloom: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "bloom_puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08], drag: 0.9, spin: 18,
                    lifetime: [8, 16], size: [0.14, 0.04],
                    color: 0xF6F3EA, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        wrap: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "wrap_fluff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "fluff", fallback: 26 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.93, gravity: 0.002, spin: 22,
                    lifetime: [16, 28], size: [0.2, 0.05],
                    color: 0xF6F3EA, alpha: [0.85, 0], light: "world", maxParticles: 160
                },
                {
                    name: "wrap_puff", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [18, 30], size: [0.3, 0.6],
                    color: 0xE4D6C4, alpha: [0.24, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crush: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "crush_press", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 6 },
                    shape: { kind: "sector", radius: 0.45, angleDegrees: 150 },
                    orient: "heading", direction: "inward", spread: 18,
                    speed: [0.03, 0.12], drag: 0.85, spin: 16,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xE4D6C4, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "crush_bounce", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "layers", fallback: 4 }, interval: 1, repeats: 2 },
                    shape: { kind: "sector", radius: 0.45, angleDegrees: 150 },
                    orient: "heading", direction: "outward", spread: 30,
                    speed: [0.08, 0.24], drag: 0.9, gravity: 0.002, spin: 22,
                    lifetime: [10, 18], size: [0.18, 0.04],
                    color: 0xF6F3EA, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        bare: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bare_fall", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.04, drag: 0.92, spin: 20,
                    lifetime: [12, 20], size: [0.12, 0.03],
                    color: 0xEFE7D8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cottonguard", 1, CottonGuardDefinition);

/**
 * 贴身绒层：按服务端真实的剩余层数，在身体周围固定位置画同样数量的棉团。
 * 数量直接来自 data.layers；层被压掉时下一次更新就少画一团。不生成粒子或实体。
 */
WorldCombatClient.scene("world_combat:move_cottonguard_layers", 1, function (frame) {
    const entry: CombatSceneEntry<{ moment?: string; layers?: number; total?: number; scale?: number; heavy?: number; hitside?: number; direction?: number[] }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.moment !== "coat") return;
    const shift = typeof data.scale === "number" ? Math.max(0.6, Math.min(1.8, data.scale)) : 1;
    const total = typeof data.total === "number" && data.total > 0 ? Math.min(6, Math.round(data.total)) : 6;
    const layers = typeof data.layers === "number" ? Math.max(0, Math.min(total, Math.round(data.layers))) : total;
    if (!layers) return;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (!anchor) return;
    const height = anchor.height > 0 ? anchor.height : 1.4;
    const color = (0xE8 << 24) | 0xF6F3EA;
    let offset = data.heavy === 1 ? 0.4 : 0;
    // 受击后缺口落在打击来向：让第 layers 个槽位（已被压掉的那个）正对 data.direction。
    if (data.hitside === 1 && Array.isArray(data.direction))
        offset = Math.atan2(data.direction[1], data.direction[0]) - layers * 2.399963;
    for (let i = 0; i < layers; i++) {
        const angle = i * 2.399963 + offset;
        const band = 0.2 + (i % 3) * 0.24;
        const radius = (0.15 + 0.09 * (i % 2)) * shift;
        const size = (0.24 + (i % 3) * 0.03) * shift;
        frame.sprite("cobblemon:particle/generic/cotton",
            anchor.x + Math.cos(angle) * radius,
            anchor.y + height * (0.26 + band * 0.5),
            anchor.z + Math.sin(angle) * radius,
            size, 0, color, i % 2, false);
    }
});
