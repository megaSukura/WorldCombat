/**
 * 小偷 / thief 的客户端表现。
 *
 * 一句话：施法者低伏探手，沿地面掠出一条暗色残影，撞上目标的一刻在接触点炸开一蓬暗紫火花；
 * 若得手，那件道具自带贴图从真实接触点沿一条归巢弧线飞回施法者，指尖闪一点金色。
 * 色相家族：暗紫（smoke / impact_dark）为主，近白细节（tinydust）作衬，金色（sparkle）只在“得手”那一小处出现。
 * 拍子：起（reach 探手）→ 击（strike 暗爆／resist 被挡下）→ 得（snatch 抓取）／空（miss 收势尘）。
 * 范围：reach 的残影沿施法者实际掠过的轨迹铺开；strike 绑命中点，画出的就是被打中的位置。
 * 运动：探手时指尖向内聚火花，掠行中拖一条贴地残影与速度线，命中是短促外爆，道具走一条归巢弧线。
 * 数：`data.motes`（速度派生的火花数）驱动掠行与命中的粒子量；`data.intensity`（本击伤害占比）由引擎放大爆发亮度与密度。
 * 探手与后撤、物品归巢走 `world_combat:move_thief_flow` 自定义场景：服务端给出真实接触点、实际退回点与物品 id，
 * 客户端按 `serverTick` 逐段插值，回执由反馈效果自持，动作收招也不影响它走完。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ThiefDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 22,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 26, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [5, 11], size: [0.07, 0.015],
                    color: 0x6B4A86, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.7, 0.25], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 3, interval: 4, repeats: 3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xE8C56A, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE9DDF4, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "sparks", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.02,
                    lifetime: [7, 15], size: [0.06, 0.01],
                    color: 0x8A66A8, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 1 }, shape: { kind: "arc", radius: 0.5, arcDegrees: 160, rotation: [0, 0, 35] },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: 10, size: [0.5, 0.1],
                    color: 0xC9AEE0, alpha: [0.8, 0], light: "full", maxParticles: 4
                }
            ]
        },
        resist: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dulled", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.11],
                    lifetime: [5, 10], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x6E6470, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "guard", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.03,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8A7E92, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        snatch: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "grip", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0x5A3E70, alpha: [0.7, 0], light: "world", maxParticles: 70
                },
                {
                    name: "acquired", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6, at: 8 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0x7A6A88, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_thief", 1, ThiefDefinition);

/**
 * 小偷每次真的探手、真的后撤与真的拿回：服务端给出真实接触点、实际退回点与物品 id。
 * `reach` 让一枚手贴图从身体短伸到接触点再收回；`back` 沿原生 displace 的实际退回段把手收回身体；
 * `homeward` 让一枚物品贴图沿低弧飞回移动中的施法者。回执由反馈效果自持，动作收招后仍能走完；
 * 固定图形，不生成粒子或实体。
 */
WorldCombatClient.scene("world_combat:move_thief_flow", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; from?: number[]; at?: number[]; item?: string; target?: string; back?: number; start?: number; dur?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data) return;
    const start = typeof data.start === "number" && isFinite(data.start) ? data.start : frame.serverTick();
    const duration = typeof data.dur === "number" && data.dur > 0 ? data.dur : 12;
    const elapsed = frame.serverTick() - start;
    if (elapsed < 0 || elapsed > duration) return;
    const from = Array.isArray(data.from) && data.from.length === 3 ? data.from : null;
    if (!from) return;
    const phase = elapsed / duration;
    if (data.moment === "reach" || data.moment === "back") {
        const at = Array.isArray(data.at) && data.at.length === 3 ? data.at : null;
        if (!at) return;
        const extend = phase < 0.5 ? phase / 0.5 : Math.max(0, 1 - (phase - 0.5) / 0.5);
        // 后撤的滚动量随原生 displace 的实际退回距离变化，机制里退得越远，画面收得越快。
        const back = typeof data.back === "number" ? data.back : 0;
        const spin = extend * (data.moment === "back" ? 8 + Math.min(28, back * 12) : 16);
        frame.sprite("cobblemon:particle/generic/grab",
            from[0] + (at[0] - from[0]) * extend, from[1] + (at[1] - from[1]) * extend, from[2] + (at[2] - from[2]) * extend,
            0.34, spin, (((0xFF << 24) | 0x6B4A86) | 0), 0, true);
        return;
    }
    if (data.moment === "homeward") {
        const caster = data.target ? JSON.parse(frame.anchor(data.target)) : null;
        const to = caster ? { x: caster.x, y: caster.y + (typeof caster.height === "number" ? caster.height : 1.4) * 0.55, z: caster.z }
            : { x: entry.position[0], y: entry.position[1], z: entry.position[2] };
        const progress = Math.max(0, Math.min(1, elapsed / duration));
        const t = progress * progress * (3 - 2 * progress);
        const lift = Math.sin(progress * Math.PI) * 0.6;
        const alpha = Math.max(0, Math.min(255, Math.round(240 * (1 - progress * 0.4))));
        frame.sprite(thiefItemSprite(data.item), from[0] + (to.x - from[0]) * t, from[1] + (to.y - from[1]) * t + lift,
            from[2] + (to.z - from[2]) * t, 0.32, progress * 360, (alpha << 24) | 0xFFE9A8, 0, true);
    }
});

/** 物品注册 id 到原版物品图集贴图 id：`cobblemon:poison_barb` -> `cobblemon:item/poison_barb`。 */
function thiefItemSprite(id: unknown): string {
    const value = String(id || "");
    if (!value) return "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";
    const split = value.indexOf(":");
    return split < 0 ? "minecraft:item/" + value : value.slice(0, split) + ":item/" + value.slice(split + 1);
}
