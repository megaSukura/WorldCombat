/**
 * 唤醒巴掌 / wakeupslap 的客户端表现。
 *
 * 一句话：施法者后撤抽臂、掌面蓄起暖光，一步压上去把掌拍实；睡着的人那一下掌风更重，睡眠符号被震裂、
 *   迸出一圈惊醒的白星。醒后只是一段短暂的迟缓，不做夸张的大范围扩散。
 * 色相家族：暖琥珀一族（0xD98A3A 主体 / 0xE8B06A 掌风与尘 / 0xFFF0C8 只做惊醒高光；梦泡沿用原生色）。
 * 拍子：起 coil（0-6t 蓄掌）→ 击 slap（掌风与尘）／醒 wake（梦泡炸裂、白星）→ 收 miss。
 * 范围：掌击与惊醒绑在真实首碰点、splash 不存在——这一掌只打一个人。
 * 运动：掌风从命中点向前炸开、尘屑落地；惊醒的白星向上迸起。
 * 数：掌风尘屑绑定 `data.dust`（体重与等级换算），惊醒火花绑定 `data.sparks`（等级换算），
 *   强弱绑定 `data.intensity`（实际伤害换算），尺寸绑定 `data.scale`。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const WakeupslapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "windup", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xFFF0C8, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xD98A3A, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        slap: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.36], spread: 24,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", maxParticles: 80
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.08, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 12 }, at: 0 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.18], spread: 40,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 20], size: [0.07, 0.02],
                    color: 0xE8B06A, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "palm_ring", bind: "point", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 14], size: [0.3, 0.6],
                    color: 0xFFF0C8, alpha: [0.6, 0], light: "full", maxParticles: 6
                }
            ]
        },
        wake: {
            duration: 26,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "dream_break", bind: "target", offset: [0, 0.7, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.34],
                    lifetime: [8, 14], size: [0.26, 0.04], sizeMode: "index",
                    alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "jolt", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.12, 0.4],
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xFFF0C8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "wake_ring", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 16], size: [0.4, 0.9],
                    color: 0xE8B06A, alpha: [0.55, 0], light: "full", maxParticles: 6
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xE8B06A, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_wakeupslap", 1, WakeupslapDefinition);

/**
 * 真实掌形：服务端在首碰点发一次，带上起始刻与强度；客户端让掌从施法者身体前方沿直线送到首碰点并短促收住，
 *   醒掌比普通掌更亮更大，读得出「这一掌拍了谁」。固定一枚掌形加一条短速度线，无粒子生灭或额外实体。
 */
const WakeupslapFist = "cobblemon:particle/generic/fist";
function wakeupslapNumber(value: any, fallback: number): number { return typeof value === "number" && isFinite(value) ? value : fallback; }

WorldCombatClient.scene("world_combat:move_wakeupslap_palm", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const to = entry.position;
    const start = wakeupslapNumber(data.start, frame.serverTick());
    const duration = Math.max(1, wakeupslapNumber(data.duration, 3));
    const progress = Math.max(0, Math.min(1, (frame.serverTick() - start) / duration));
    const scale = Math.max(0.6, Math.min(1.8, wakeupslapNumber(data.scale, 1)));
    const wake = wakeupslapNumber(data.wake, 0) > 0;
    let from = [to[0], to[1], to[2]];
    const anchor = JSON.parse(frame.anchor(entry.source));
    if (anchor) from = [anchor.x, anchor.y + anchor.height * 0.55, anchor.z];
    const x = from[0] + (to[0] - from[0]) * progress;
    const y = from[1] + (to[1] - from[1]) * progress;
    const z = from[2] + (to[2] - from[2]) * progress;
    const fade = 1 - progress * 0.45;
    frame.line(from[0], from[1], from[2], x, y, z, (Math.round(0.4 * fade * 255) << 24 | 0xE8B06A) | 0);
    const alpha = Math.round((wake ? 0.95 : 0.8) * fade * 255);
    const rgb = wake ? 0xFFF0C8 : 0xE8B06A;
    frame.sprite(WakeupslapFist, x, y, z, (0.34 + 0.12 * scale) * (wake ? 1.15 : 1), 0,
        (alpha << 24 | rgb) | 0, Math.floor(frame.serverTick() * 0.5) % 5, true);
});
