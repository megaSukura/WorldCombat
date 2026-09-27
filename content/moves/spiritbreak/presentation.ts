/**
 * 灵魂冲击 / spiritbreak 的客户端表现。
 *
 * 一句话：施法者身上收拢起一层压人的妖精气势 → 低头裹着粉色气流贴地冲出去，拖出两道冲刺线 →
 *   撞上对手的那一下炸开一朵妖精冲击花并把人推得踉跄 → 冲击点向外扩出一圈粉色光环。
 * 色相家族：妖精粉（0xF58CB8／0xFFD1E8）为主体，近白只给撞击高光。
 * 拍子：起 windup（收势）→ 冲 rush（贴地冲锋）→ 撞 smash（命中爆发）→ 余 aura（冲击点光环）。
 * 范围：单体接触招；判定是冲锋走廊，掌形与外沿由独立自定义场景（`world_combat:move_spiritbreak/palm`）贴真实
 *   掌前 1 格检测段绘制，aura 的圆环半径读 `data.radius`（判定半径与冲击尺度的派生），玩家一眼看出撞的是身前那一条。
 * 运动：施法者沿瞄准方向贴地推进（服务端位移），气势粒子沿冲锋方向被甩在身后；光环从冲击点向外扩。
 * 数：光环碎光数量绑定 `data.sparks`（物攻与等级派生），掉特攻级数绑定 `data.drop`，强度绑定
 *   `data.intensity`（单发威力 / 75）。
 */
const SpiritbreakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        palm:{emitters:[{name:"palm_pressure",bind:"path",fit:"world",particle:"world_combat_core:cobblemon/generic/softswipe",rate:30,shape:{kind:"polyline"},lifetime:[3,5],size:[.22,.06],color:0xF58CB8,alpha:[.6,.1]}]},
        intercept:{duration:12,emitters:[{name:"broken_projectile",bind:"point",fit:"world",particle:"world_combat_core:cobblemon/generic/sparkle/smallsparkle",burst:{count:{data:"sparks",fallback:12}},shape:{kind:"sphere_surface",radius:.2},direction:"outward",speed:[.05,.15],lifetime:[4,10],size:[.12,.02],color:0xF58CB8,alpha:[.9,0]}]},
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 16,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xF58CB8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.75, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    rate: 10, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0xFFD1E8, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        rush: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "dash", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 40, shape: { kind: "box", size: [0.5, 0.6, 0.5] },
                    direction: "away", speed: [0.05, 0.2], spin: 6,
                    lifetime: [5, 10], size: [0.3, 0.08],
                    color: 0xF58CB8, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "pulse", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.04, 0.18], spread: 20, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFD1E8, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        smash: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28,
                    lifetime: [7, 14], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFD1E8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "shove", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "sparks", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.04, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xF58CB8, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        aura: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.18, 0.5], spread: 6,
                    lifetime: [8, 16], size: [0.3, 0.9],
                    color: 0xF58CB8, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "sparks", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFD1E8, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spiritbreak", 1, SpiritbreakDefinition);

/**
 * 掌形与掌前外沿：服务端每刻按真实身体位置与朝向重发掌前 1 格检测段的两个端点，
 * 客户端沿同一段画两条外沿并把掌面贴在段尾，读得出掌挡住的是身前哪一条，而不是整段随机发射的掌线。
 */
const SpiritbreakPalmScene = "world_combat:move_spiritbreak/palm";
const SpiritbreakPalmSprite = "cobblemon:particle/generic/hollowfist";

function spiritbreakPalmPoint(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function spiritbreakPalmNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

WorldCombatClient.scene(SpiritbreakPalmScene, 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data: any = entry.data || {};
    if (data.lifecycle) return;
    const path = Array.isArray(data.path) ? [spiritbreakPalmPoint(data.path[0]), spiritbreakPalmPoint(data.path[1])] : [];
    if (path.length < 2 || path[0] === null || path[1] === null) return;
    const from = path[0]!, to = path[1]!;
    const radius = Math.max(0.25, Math.min(0.95, spiritbreakPalmNumber(data.radius, 0.4)));
    const scale = Math.max(0.6, Math.min(1.8, spiritbreakPalmNumber(data.scale, 1)));
    const dx = to[0] - from[0], dz = to[2] - from[2];
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 1e-4) return;
    const sx = -dz / length, sz = dx / length;
    const y = (from[1] + to[1]) / 2 + 0.06;
    const edge = 0xCCF58CB8 | 0;
    const soft = 0x99FFD1E8 | 0;
    // 两条外沿 + 段尾封口：就是掌前那 1 格的检测范围。
    frame.line(from[0] + sx * radius, y, from[2] + sz * radius, to[0] + sx * radius, y, to[2] + sz * radius, edge);
    frame.line(from[0] - sx * radius, y, from[2] - sz * radius, to[0] - sx * radius, y, to[2] - sz * radius, edge);
    frame.line(to[0] + sx * radius, y, to[2] + sz * radius, to[0] - sx * radius, y, to[2] - sz * radius, edge);
    const tick = frame.serverTick();
    frame.sprite(SpiritbreakPalmSprite, to[0], to[1] + 0.12, to[2], radius * 1.5 * scale, 0,
        0xE0FFD1E8 | 0, Math.floor(tick * 0.5) % 6, true);
    frame.sprite("cobblemon:particle/generic/softswipe", to[0], to[1] + 0.08, to[2], radius * 1.2 * scale, 0,
        soft, Math.floor(tick) % 8, true);
});
