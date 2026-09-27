/**
 * 吸取拳 / drainpunch 的客户端表现。
 *
 * 一句话：指节在真实朝向前侧攥起暖光 → 拳头从体侧一处直送对手并收回，接触点炸开暖白拳风与橙红碎光 → 对手身上的力量沿拳路被抽回拳面，绕拳收成一小圈。
 *
 * 色相家族：暖橙（0xE8A24A／0xC9762E）与近白（0xFFD9A0）；近白只给命中核心与回流点，无第二色相。
 * 拍子：起 windup（瞄准前侧攥拳聚光）→ 拳 punch（拳头前伸收回到真实接触点）／空 miss（同样前伸但收短）→ 抽 sap（力量沿拳路回流）。
 * 范围：punch 以 `data.scale`（拳面判定 / 0.4）铺开接触点，玩家看清拳落在身体哪一处；sap 的 path 把对手与拳面连成实线，
 *   线的两端就是机制的「目标→自身」。sap 只在服务端确认这一拳真的回了血时才出现，强度由实际治疗量换算。
 * 运动：拳头的体侧起点、接触点与朝向由服务端逐拍按当刻 forward/right/up 算出（见自定义场景 move_drainpunch_fist），
 *   所以转身后拳头从新的肩位出发，不会漂到世界某一侧；sap 的线发射器 orient=direction、fit=world
 *   沿真实跨度把力量抽回拳面，速度与数量随 `data.motes`（实际治疗量换算）增长。
 * 数：`data.punch`／`data.punches`（第几拳、共几拳）让连打式从画面读出打到第几下，`data.intensity` 随拳威抬升亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DrainPunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "knuckle_gather", bind: "point", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.09], spin: 40,
                    lifetime: [6, 12], size: [0.10, 0.02],
                    color: 0xE8A24A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fist_glow", bind: "point", height: 0.55, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 11], size: [0.10, 0.01],
                    color: 0xFFD9A0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        punch: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 10], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFD9A0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "knuckle_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/minihit",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.07, 0.26], spread: 26, spin: 60,
                    lifetime: [5, 10], size: [0.16, 0.03],
                    color: 0xC9762E, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "punch_marks", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fist",
                    burst: { count: { data: "punch", fallback: 1 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [9, 16], size: [0.22, 0.03],
                    color: 0xE8A24A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 8
                }
            ]
        },
        sap: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.02, 0.08], spread: 10,
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC9762E, alpha: [0.75, 0], light: "world", maxParticles: 70
                },
                {
                    name: "flow", bind: "point", orient: "direction", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 2.4 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.14, 0.36], spread: 9,
                    lifetime: [5, 12], size: [0.10, 0.01],
                    color: 0xFFD9A0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "fist_receive", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "intensity", fallback: 1 },
                    shape: { kind: "sphere", radius: 0.16 }, direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.12, 0.01],
                    color: 0xFFD9A0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9A8E74, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_drainpunch", 1, DrainPunchDefinition);

/**
 * 每拍拳头的真实前伸／收回轨迹（自定义客户端场景，不生成粒子或实体）：
 * 服务端按当刻朝向给出体侧起点 `from`、真实接触点 `at`，这里用 `serverTick` 在前 40% 的时间把拳头
 * 从体侧直送到接触点、随后收回；命中用暖白、落空用灰尘并少送一段。拳印仍由 punch 幕留在接触处，
 * 真治的回光由服务端确认后单独发 sap。固定一个拳头图形，无粒子生灭或额外实体开销。
 */
WorldCombatClient.scene("world_combat:move_drainpunch_fist", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.moment !== "punch" && data.moment !== "miss") return;
    const from = Array.isArray(data.from) ? data.from : null;
    const at = Array.isArray(data.at) ? data.at : null;
    if (!from || !at || from.length !== 3 || at.length !== 3) return;
    const start = typeof data.start === "number" && isFinite(data.start) ? data.start : frame.serverTick();
    const duration = typeof data.dur === "number" && data.dur > 0 ? data.dur : 18;
    const elapsed = frame.serverTick() - start;
    if (elapsed < 0 || elapsed > duration) return;
    const phase = elapsed / duration;
    const reach = phase < 0.4 ? phase / 0.4 : Math.max(0, 1 - (phase - 0.4) / 0.6);
    const extension = reach * (data.moment === "punch" ? 1 : 0.72);
    const x = from[0] + (at[0] - from[0]) * extension;
    const y = from[1] + (at[1] - from[1]) * extension;
    const z = from[2] + (at[2] - from[2]) * extension;
    const spriteFrame = Math.max(0, Math.min(4, Math.floor(reach * 5)));
    const color = (((0xFF << 24) | (data.moment === "punch" ? 0xFFD9A0 : 0xA89878)) | 0);
    const roll = (data.moment === "punch" ? 1 : -1) * reach * 24;
    frame.sprite("cobblemon:particle/generic/fist", x, y, z, 0.42, roll, color, spriteFrame, true);
    if (extension > 0.05) {
        const streak = (((Math.round(90 * extension) << 24) | 0xE8A24A) | 0);
        frame.line(from[0], from[1], from[2], x, y, z, streak);
    }
});
