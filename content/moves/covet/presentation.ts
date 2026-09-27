/**
 * 渴望 / covet 的客户端表现。
 *
 * 一句话：施法者头顶飘起心形、指尖聚起粉色微光，缓缓蹭近时拖一条贴地粉痕；贴上的一刻在目标身上炸开一蓬
 * 心形与粉光（攻势被这份可爱分掉），若得手，那件道具带贴图从真实接触点沿一条归巢弧线飞回施法者、指尖闪一点金色。
 * 归巢的物品与短伸的手走 `world_combat:move_covet_flow` 自定义场景，由反馈效果自持、随真实锚点收束。
 * 色相家族：粉（infatuation_heart / glowingsparkle_pink）为主，近白细节（smallsparkle / tinydust）作衬，
 * 金色（glowingsparkle_yellow）只在“得手”那一小处出现。
 * 拍子：起（whisper 撒娇）→ 贴（approach 蹭近）→ 击（charm 心神被分）→ 得（steal 归巢弧）／空（flop 收势）。
 * 范围：approach 的粉痕沿施法者实际蹭过的轨迹铺开；charm 绑目标，画出的就是被贴上的人。
 * 运动：撒娇时心形向上飘、指尖粉光向内聚；蹭近拖一条贴地粉痕；贴上是心形外散加一圈脚边粉环；道具走归巢弧线。
 * 数：`data.hearts`（亲密度与速度派生的心形数）驱动撒娇与得手的心形量；`data.soft`（降攻级数）放大 charm 的心形与亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const CovetDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        whisper: {
            duration: 30,
            exit: { stop: 18, drain: 14 },
            emitters: [
                {
                    name: "flutter", bind: "source", offset: [0, 0.1, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: { data: "hearts", fallback: 6 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xF7A6C8, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 18, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFC4DE, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.75, 0.3], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 3, interval: 5, repeats: 3 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        approach: {
            duration: 26,
            exit: { stop: 16, drain: 12 },
            emitters: [
                {
                    name: "ribbon", bind: "source", offset: [0, 0.05, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 44, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.08, 0.01],
                    color: 0xF7A6C8, alpha: [0.75, 0], light: "full", maxParticles: 70
                },
                {
                    name: "drift", bind: "source", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 9, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xFFC4DE, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charm: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "befuddle", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 8 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.02, spin: 8,
                    lifetime: [10, 22], size: [0.13, 0.02],
                    color: 0xF7A6C8, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "softlight", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 8 }, amount: { data: "soft", fallback: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xFFB8D8, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.4, 0.14],
                    color: 0xF7A6C8, alpha: [0.6, 0], light: "full", maxParticles: 4
                }
            ]
        },
        steal: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "pluck", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: { data: "hearts", fallback: 8 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.1, 0.02],
                    color: 0xE48FB5, alpha: [0.7, 0], light: "world", maxParticles: 50
                },
                {
                    name: "acquired", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6, at: 8 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", maxParticles: 16
                }
            ]
        },
        flop: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03,
                    lifetime: [6, 13], size: [0.05, 0.01],
                    color: 0xD8A8BE, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "lastheart", bind: "point", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 2, at: 4 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xF7C6DA, alpha: [0.5, 0], light: "full", maxParticles: 6
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_covet", 1, CovetDefinition);

/**
 * 渴望每次真的伸手与真的拿回：服务端给出当刻身体起点与真实接触点 `reach`，或真实接触点与施法者 `homeward`。
 * 这里用 `serverTick` 让一枚手贴图短伸再收回，或让一枚物品贴图沿低弧飞回移动中的施法者。
 * 回执由反馈效果自持（不挂在动作弹上），动作收招也不影响它走完；固定图形，不生成粒子或实体。
 */
WorldCombatClient.scene("world_combat:move_covet_flow", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; from?: number[]; at?: number[]; item?: string; target?: string; start?: number; dur?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data;
    if (!data) return;
    const start = typeof data.start === "number" && isFinite(data.start) ? data.start : frame.serverTick();
    const duration = typeof data.dur === "number" && data.dur > 0 ? data.dur : 12;
    const elapsed = frame.serverTick() - start;
    if (elapsed < 0 || elapsed > duration) return;
    const from = Array.isArray(data.from) && data.from.length === 3 ? data.from : null;
    if (!from) return;
    if (data.moment === "reach") {
        const at = Array.isArray(data.at) && data.at.length === 3 ? data.at : null;
        if (!at) return;
        const phase = elapsed / duration;
        const extend = phase < 0.5 ? phase / 0.5 : Math.max(0, 1 - (phase - 0.5) / 0.5);
        frame.sprite("cobblemon:particle/generic/grab",
            from[0] + (at[0] - from[0]) * extend, from[1] + (at[1] - from[1]) * extend, from[2] + (at[2] - from[2]) * extend,
            0.34, extend * 16, (((0xFF << 24) | 0xF7A6C8) | 0), 0, true);
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
        frame.sprite(covetItemSprite(data.item), from[0] + (to.x - from[0]) * t, from[1] + (to.y - from[1]) * t + lift,
            from[2] + (to.z - from[2]) * t, 0.32, progress * 360, (alpha << 24) | 0xFFE9A8, 0, true);
    }
});

/** 物品注册 id 到原版物品图集贴图 id：`cobblemon:oran_berry` -> `cobblemon:item/oran_berry`。 */
function covetItemSprite(id: unknown): string {
    const value = String(id || "");
    if (!value) return "cobblemon:particle/generic/sparkle/glowingsparkle_yellow";
    const split = value.indexOf(":");
    return split < 0 ? "minecraft:item/" + value : value.slice(0, split) + ":item/" + value.slice(split + 1);
}
