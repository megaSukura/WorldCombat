/**
 * 挺住的客户端表现。
 *
 * 一句话：贴身的暗红呼吸纹随心跳一收一放，致命一击落下的一瞬从身体炸开一圈橙白闪光与一颗 1 HP 脉冲，
 * 同时亮出还剩下几次保命，随后纹路迅速熄灭。
 * 色相家族：暗红与橙（warblingring / impact_fighting / fadeheart_white / ember 系），闪光只用同族亮白强调。
 * 拍子：起（raise，咬牙预兆，随动作结束收）→ 持（guard，自定义场景逐帧画轮廓与剩余心，随 guard 托管效果存续）→ 击（save 只在真截住致命击时单闪）→ 收（spent 迅速熄灭）。
 * 范围：raise 是随身体缩放的短暂咬牙纹；持窗轮廓由自定义场景按真实身体锚点逐帧绘制，画多久就是还剩多久。
 * 运动：raise 缓慢脉动；保命时冲击向外炸开并带上扬光点，负值重力让它们回落后消散。
 * 数：`data.lethalCount`（被截断伤害／最大生命的 30 倍）是保命爆点数量，`data.intensity`（剩余次数／初始次数）缩放亮度，
 *   `data.charges`（还剩几次保命）就是轮廓上方的实心心数。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const EndureDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "breath_line", bind: "source", offset: [0, 0.55, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 7, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.0, 0.01],
                    lifetime: [22, 38], size: [0.4, 0.4], sizeMode: "sin",
                    color: 0xB03024, alpha: [0.38, 0.12], alphaMode: "sin",
                    light: "world", maxParticles: 22
                },
                {
                    name: "breath_core", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 5, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [20, 32], size: [0.34, 0.34], sizeMode: "sin",
                    color: 0xE07038, alpha: [0.32, 0.1], alphaMode: "sin",
                    light: "full", maxParticles: 16
                },
                {
                    name: "heart", bind: "source", offset: [0, 0.58, 0], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 22], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0xFF9A6A, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        save: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 16, at: 1 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 15], size: [0.36, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "one_hp", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14, at: 0 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.4, 0.1],
                    color: 0xFFF2D8, alpha: [0.95, 0], light: "full", bloom: 0.5
                },
                {
                    name: "burst", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "lethalCount", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFD9A8, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "lifeline", bind: "target", offset: [0, 0.92, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: { data: "charges", fallback: 1 } }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [16, 24], size: [0.15, 0.15],
                    color: 0xFFE0C0, alpha: [1, 0], light: "full"
                },
                {
                    name: "rise", bind: "target", offset: [0, 0.3, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [14, 26], size: [0.08, 0.01],
                    color: 0xFFB06A, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        spent: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.4, 0.08],
                    color: 0x8A4A44, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "breath", bind: "target", height: 0.45, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.22, 0.06],
                    color: 0x6A4A48, alpha: [0.25, 0], gravity: 0.02, light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_endure", 1, EndureDefinition);

/**
 * 持窗轮廓：读 `data.charges`（还剩几次保命）与 `data.intensity`（剩余次数／初始次数），
 * 逐帧按施法者真实身体锚点画两圈暗红轮廓（腰线与肩线）和对应数量的心。
 * 由 guard 托管效果的 onEffect 拥有：条目在多久就画多久，guard 结束、到期或驱散时条目消失即收，
 * 逐帧绘制固定数量、无粒子生灭、无额外实体成本。挣扎取向用偏橙的轮廓与背景区分。
 */
WorldCombatClient.scene("world_combat:move_endure_guard", 1, function (frame) {
    const entry: CombatSceneEntry<{ actor?: string; charges?: number; intensity?: number; scramble?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    let x = entry.position[0], y = entry.position[1], z = entry.position[2], height = 1.4, width = 0.9;
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) { x = anchor.x; y = anchor.y; z = anchor.z; height = Math.max(0.6, anchor.height); width = Math.max(0.4, anchor.width); }
    const intensity = Math.max(0.2, Math.min(1, typeof data.intensity === "number" ? data.intensity : 1));
    const scratch = data.scramble === 1;
    const alpha = Math.round((0.22 + 0.5 * intensity) * 255);
    const ringColor = (alpha << 24) | (scratch ? 0xC07038 : 0xB03024);
    const radius = Math.max(0.35, width * 0.6 + 0.1);
    const segments = 10;
    for (let band = 0; band < 2; band++) {
        const by = y + height * (0.34 + band * 0.42);
        let prevX = x + radius, prevZ = z;
        for (let i = 1; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
            frame.line(prevX, by, prevZ, px, by, pz, ringColor);
            prevX = px; prevZ = pz;
        }
    }
    const charges = Math.max(0, Math.min(2, Math.round(data.charges || 0)));
    if (charges > 0) {
        const frameIndex = Math.floor(frame.serverTick() * 0.5) % 4;
        const heartColor = (255 << 24) | 0xFF9A6A;
        const gap = 0.34, top = y + height + 0.35;
        const startX = x - (charges - 1) * gap * 0.5;
        for (let i = 0; i < charges; i++)
            frame.sprite("cobblemon:particle/generic/fadeheart_white", startX + i * gap, top, z, 0.32, 0, heartColor, frameIndex, true);
    }
});
