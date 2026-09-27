/**
 * 回收利用 / recycle 的客户端表现。
 *
 * 一句话：施法者俯身，四周的碎片与记忆里的那件道具以弧线朝掌心聚拢；收拢环合拢的一刻，那件道具的小图沿一条
 * 归巢弧线落进持有槽，掌心落一圈金光。
 * 色相家族：回收金（sparkle / orb）为主，暖褐（smoke）作余韵；金色只在「锻成」的一小片面积上最亮。
 * 拍子：收（gather 内聚碎屑）→ 成（forge 道具图归槽与掌心爆发）／空（fizzle 空转尘）。
 * 范围：gather 是贴身的向内聚合，不再画地面搜索圈；forge 绑施法者，画出的就是道具归巢的落点。
 * 运动：碎屑由外向掌心内聚，道具图沿归巢弧线落进持有槽；内聚用 inward、落定用 outward 短促外爆。
 * 数：`data.motes`（等级派生的回收火花数）驱动内聚与爆发粒子量；`data.item`（记忆里那件的真实 id）驱动归槽的小图。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const RecycleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "scrap", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "motes", fallback: 10 },
                    shape: { kind: "sphere", radius: 1.1 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xB99B5E, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "memory", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 5, interval: 5, repeats: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xFFE9A8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 20
                }
            ]
        },
        forge: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "motes", fallback: 10 }, at: 6 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "settle", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 6 },
                    shape: { kind: "ring", radius: 0.45, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.05],
                    color: 0xFFF2C9, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 6
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 7 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x8A7856, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_recycle", 1, RecycleDefinition);

/**
 * 归巢的小物品图：`data.item` 是真正回复的那件 id，从其消费记忆处沿一条短弧聚到持有槽（身前、胸口高度）。
 * 固定数量（每刻一枚），不生成粒子或实体；贴图取物品图集 `item/<path>`。
 */
function recycleItemTexture(item: string): string {
    const split = item.indexOf(":");
    const namespace = split < 0 ? "minecraft" : item.slice(0, split);
    const path = split < 0 ? item : item.slice(split + 1);
    return namespace + ":item/" + path;
}
WorldCombatClient.scene("world_combat:move_recycle_item", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "forge" || typeof data.item !== "string" || !data.item) return;
    const anchor: any = JSON.parse(frame.anchor(entry.source));
    if (!anchor || typeof anchor.x !== "number" || typeof anchor.yaw !== "number") return;
    const yaw = Number(anchor.yaw) * Math.PI / 180;
    const forward = [-Math.sin(yaw), 0, Math.cos(yaw)];
    const height = Math.max(0.16, Math.min(0.45, Number(anchor.height) * 0.26));
    const reach = Number(anchor.width) * 0.5 + 0.2;
    const slotX = Number(anchor.x) + forward[0] * reach;
    const slotY = Number(anchor.y) + Number(anchor.height) * 0.6;
    const slotZ = Number(anchor.z) + forward[2] * reach;
    const start = typeof data.start === "number" ? data.start : frame.serverTick();
    const duration = typeof data.duration === "number" && data.duration > 0 ? data.duration : 10;
    const t = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const ease = t * t * (3 - 2 * t);
    const x = Number(anchor.x) + (slotX - Number(anchor.x)) * ease;
    const y = Number(anchor.y) + Number(anchor.height) * 0.2 + (slotY - Number(anchor.y) - Number(anchor.height) * 0.2) * ease + Math.sin(Math.PI * t) * 0.22;
    const z = Number(anchor.z) + (slotZ - Number(anchor.z)) * ease;
    const size = height * (0.65 + 0.35 * ease);
    const alpha = Math.round(255 * Math.min(1, 0.45 + 0.55 * ease));
    frame.sprite(recycleItemTexture(data.item), x, y, z, size, 0, (alpha << 24 | 0xFFFFFF) | 0, 0, true);
});
