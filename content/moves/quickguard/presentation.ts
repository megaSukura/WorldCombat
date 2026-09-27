/**
 * 快速防守 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者按地，一排青白色的快板从身前斜撑起来、横着摊开罩住身边的伙伴；每个人身上的板边在
 *   8／12 刻里快速向内收缩成倒计时，真正接住那一记直击的瞬间在接触点炸出一片碎光、板随即散掉。
 *
 * 色相家族：青白（0xBFE3FF）为主体，近白（0xEDF6FF）做高光与碎光，深蓝（0x5B7FA6）做落板与余韵；没有第二个色相。
 * 层次：聚板（起）／板面与快光（击）／收缩倒计时板边（持续，自定义回调）／接住直击的接触碎光（事件）／落板（收）。
 * 起击收：brace（起）→ raise（击）→ hold（持续）→ block（事件）→ fall（收）。
 * 范围：raise 的地环与落板绑落点、fit none，半径按 `data.scale`（实际遮蔽半径 / 3.2）推出。
 * 数：快板数绑 `data.plates`（速度派生），光点量绑 `data.motes`（速度派生），尺寸与范围绑 `data.scale`。
 * 持续：hold 是自定义回调 `world_combat:move_quickguard_hold`，读每次核验后的 `data.start/window/plates`，
 *   逐帧把板边半径按剩余时间收缩；它绑在真实的 pool 上，板被接住消耗或到时，条目随效果一起释放。
 */
const QuickGuardDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "brace_line", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 10, shape: { kind: "sphere", radius: 1.0 },
                    direction: "inward", speed: [0.04, 0.12], drag: 0.9, spin: 6,
                    lifetime: [8, 14], size: [0.24, 0.06],
                    color: 0xEDF6FF, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        raise: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "raise_ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.3, 0.12],
                    color: 0xBFE3FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                },
                {
                    name: "raise_panel", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "plates", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.15], drag: 0.9,
                    lifetime: [14, 24], size: [0.44, 0.14],
                    color: 0xEDF6FF, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "raise_spark", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xBFE3FF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        block: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "block_burst", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "plates", fallback: 8 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.88, spin: 16,
                    lifetime: [8, 16], size: [0.3, 0.06],
                    color: 0xEDF6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "block_spark", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 18 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [6, 14], size: [0.12, 0.02],
                    color: 0xBFE3FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                }
            ]
        },
        fall: {
            duration: 24,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "fall_line", bind: "target", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [14, 24], size: [0.2, 0.05],
                    color: 0x5B7FA6, alpha: [0.4, 0], light: "world", maxParticles: 34
                },
                {
                    name: "fall_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.94,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    color: 0x5B7FA6, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_quickguard", 1, QuickGuardDefinition);

// 收缩倒计时：每个被罩住的人一张板，板边半径按剩余时间从满缩向中心；到期或被接住消耗时随 pool 效果一起释放。
WorldCombatClient.scene("world_combat:move_quickguard_hold", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ start: number; window: number; radius: number; plates: number; scale: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {} as any;
    const start = Number(data.start) || 0, window = Math.max(1, Number(data.window) || 12);
    const progress = Math.min(1, Math.max(0, (frame.serverTick() - start) / window));
    const scale = Math.max(0.4, Math.min(3, Number(data.scale) || 1));
    const radius = (0.55 + 0.45 * (1 - progress)) * scale;
    const x = entry.position[0], y = entry.position[1], z = entry.position[2];
    const alpha = Math.max(40, Math.min(255, Math.round(230 * (1 - progress) + 25)));
    const color = ((alpha << 24) | 0xBFE3FF) | 0;
    frame.ring(x, y + 0.06, z, radius, color);
    const plates = Math.max(4, Math.min(20, Math.round(Number(data.plates) || 8)));
    for (let i = 0; i < plates; i++) {
        const angle = i * Math.PI * 2 / plates;
        const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
        frame.line(px, y + 0.04, pz, px, y + 0.04 + 0.5 * (1 - progress) * scale, pz, color);
    }
});
