/**
 * 怨恨 / spite 的客户端表现。
 *
 * 一句话：施法者头顶聚起一团暗紫怨念，脱手后自己扭着追向目标；咬中时先把被记住的那一手缠成一道怨符
 * （`bind`），真的抽走了 PP 才额外迸出碎念（`bite`，抽得越多、碎片越多越亮）；没有可读进攻又没扣到 PP 时
 * 只散一缕空烟（`empty`）。怨符留在目标身上（`hold`），等它再用同一手打出有效直击时碎去（`shatter`），
 * 或在记忆到期时淡散（`fade`）。
 * 色相家族：暗紫与靛蓝为底（fire/wisp 的紫、smoke 的深灰紫），骨白只出现在“咬/碎”的核心与碎片上。
 * 拍子：起（windup 0–14t 凝聚）→ 追（travel 尾迹）→ 咬（bind/bite/empty）→ 留（hold，随预算窗口）
 *   → 碎（shatter）或散（fade）；空程为 fizzle。
 * 数：服务端把 `shards`（随特攻派生）、`taken`（实际扣掉的 PP）与 `intensity` 交给发射器；碎片数量与
 *   “咬”的亮度由机制值决定，`shards` 同时驱动 hold 怨符的密度。
 */
const SpiteDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "grudge_kindle", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "shards", fallback: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0x6B4FB8, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "grudge_pull", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xD9CFF2, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 90,
            exit: { stop: 90, drain: 14 },
            emitters: [
                {
                    name: "bolt_core", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "flow", fallback: 24 }, trail: { minDistance: 0.18 },
                    shape: { kind: "sphere", radius: 0.07 }, direction: "shape", speed: [0, 0.02],
                    lifetime: [8, 14], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0x8F6BE0, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "bolt_trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "flow", fallback: 16 }, trail: { minDistance: 0.26 },
                    direction: "shape", speed: [0, 0.03], drag: 0.9,
                    lifetime: [14, 24], size: [0.14, 0.04],
                    color: 0x2E2340, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        bind: {
            // 被记住的那一手缠成怨符：只在真的挂上预算时发出，数量随特攻派生的 shards。
            duration: 34,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "bind_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x6B4FB8, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "bind_mark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        bite: {
            // 真的扣掉了 PP 才有这一口；数量就是实际扣掉的 taken。
            duration: 36,
            exit: { stop: 18, drain: 24 },
            emitters: [
                {
                    name: "pp_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "taken", fallback: 0 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: { data: "intensity", fallback: 0.25 },
                    lifetime: [8, 14], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xC9B8F0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "pp_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "taken", fallback: 0 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: { data: "intensity", fallback: 0.25 },
                    lifetime: [12, 22], size: { data: "size", fallback: 0.12 },
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        hold: {
            // 托管效果持有的怨符：随预算窗口存续，跟随目标；密度由 shards 驱动。
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "held_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: { data: "shards", fallback: 8 }, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.004, 0.02],
                    lifetime: [16, 26], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0x6B4FB8, alpha: [0.5, 0], light: "full", maxParticles: 26
                },
                {
                    name: "held_mote", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "shards", fallback: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [14, 24], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0x8F6BE0, alpha: [0.55, 0], light: "full", maxParticles: 22
                }
            ]
        },
        shatter: {
            // 被记住的那一手再次打出有效直击：怨符碎去。
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shatter_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "shards", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.12, 0.3],
                    lifetime: [8, 16], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9B8F0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "shatter_fragments", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xD9CFF2, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        fade: {
            // 记忆自然到期：怨符自行淡散。
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "fade_smoke", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x2E2340, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        },
        empty: {
            // 没有可读进攻又没扣到 PP：只散一缕空烟，不报成功。
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "snuff", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x2E2340, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "snuff", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x2E2340, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spite", 1, SpiteDefinition);

// One identity glyph belongs to the live grudge budget; its caption names the remembered move or native route.
WorldCombatClient.scene("world_combat:move_spite_identity", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle || !data.target) return;
    const raw = frame.anchor(String(data.target));
    if (!raw) return;
    const body = JSON.parse(raw);
    if (!body) return;
    const y = body.y + body.height + .24;
    frame.sprite("cobblemon:particle/generic/status/accessory_spark", body.x, y, body.z, .22, 0, 0xE0C9B8F0 | 0, 0, true);
    const route = data.path === "projectile" ? "projectile" : data.path === "contact" ? "contact" : "direct";
    const caption = data.move ? frame.translate("cobblemon.move." + String(data.move))
        : frame.translate("world_combat.move.spite.identity." + route);
    frame.billboard(String(data.target), body.height + .48, .012, surface => surface.text(caption, 0, 0, 0xE0C9B8F0 | 0, 110));
});
