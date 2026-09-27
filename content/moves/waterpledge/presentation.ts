/**
 * 水之誓约 / waterpledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈青蓝的水纹符文，随后一根水柱从真实地面涌起，把柱内的人沿柱心径向顶起推开，柱脚只浸出
 *   一圈短寿的水纹印（共鸣标记，本身不拖慢）；只有与火／草真正共鸣时，同一圈印才升起一道真正的虹彩弧冠，
 *   或塌成一汪冒泡的湿地并露出泥水边缘。
 * 色相家族：青蓝到近白（waterjet／giantplash／water_ripple／smallbubble／impact_water）；彩虹时刻引入虹彩
 *   （glowingsparkle 上色后的七色弧冠），湿地时刻引入土褐（mudbubble）。
 * 拍子：起（mark 地面水纹）→ 击（erupt 水柱 + hit 命中点，命中带一条沿推离方向的短水线）→ 留（scar 短印，或 rainbow／wetland 组合场）。
 * 范围：mark／scar／rainbow／wetland 的花环半径 = `data.scale` × 参考 1.6 格（= 实际誓约印半径）；
 *   erupt 的柱体 shape 直接绑定 `data.radius`／`data.height`，画面里的那根水柱就是实际判定柱。
 * 归属：scar／rainbow／wetland 三个阶段 duration 0（活到服务器释放 key），随真实场地效果一起结束；
 *   边界／边缘由自定义场景 move_waterpledge_field 画真实半径圆环并按 `data.remaining`／`data.life` 渐隐；
 *   彩虹弧冠由自定义场景 move_waterpledge_crown 沿真实半径画成。
 * 数：`data.count`（由特攻与地面水痕数量派生）决定水花、贴地水痕与组合场的粒子数量。
 */
const WaterpledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0x66CCEE, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rune_bubble", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "ring", radius: 1.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xBFE8F5, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_water", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "up", speed: [0.15, 0.6],
                    lifetime: [10, 20], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x66CCEE, alpha: [0.85, 0], gravity: -0.03, drag: 0.94, light: "full", maxParticles: 420
                },
                {
                    name: "column_splash", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "count", fallback: 40 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "shape", speed: [0.1, 0.5],
                    lifetime: [10, 20], size: [0.2, 0.03],
                    color: 0xE0F6FF, alpha: [0.9, 0], gravity: 0.05, drag: 0.95, light: "full", maxParticles: 320
                },
                {
                    name: "column_bubbles", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 120,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "up", speed: [0.1, 0.45],
                    lifetime: [12, 24], size: [0.12, 0.02],
                    color: 0xDFF6FF, alpha: [0.8, 0], gravity: -0.04, drag: 0.96, light: "full", maxParticles: 260
                },
                {
                    name: "ground_splash", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "outward", speed: [0.06, 0.25],
                    lifetime: [8, 14], size: [0.16, 0.02],
                    color: 0xCFEFFA, alpha: [0.7, 0], gravity: 0.06, light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "spray", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/fishsplash",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.45],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xCFEFFA, alpha: [0.95, 0], gravity: 0.05, light: "full"
                },
                {
                    name: "push_streak", bind: "target", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "line", length: { data: "push", fallback: 1 } },
                    orient: "direction", direction: "shape", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xBFE8F5, alpha: [0.85, 0], light: "world", maxParticles: 24
                }
            ]
        },
        scar: {
            duration: 0,
            exit: { drain: 26 },
            emitters: [
                {
                    name: "pool", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "count", fallback: 12 }, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x66CCEE, alpha: [0.55, 0], light: "world", maxParticles: 100
                },
                {
                    name: "bubbles", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 12, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rainbow: {
            duration: 0,
            exit: { drain: 30 },
            emitters: [
                {
                    name: "blessing", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFFD7EE, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "rainbow_motes", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 18, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 120
                }
            ]
        },
        wetland: {
            duration: 0,
            exit: { drain: 30 },
            emitters: [
                {
                    name: "mire", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 30, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 30], size: [0.18, 0.03],
                    color: 0x6A5230, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "wet_pulse", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x7FB8A8, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "reeds", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x5E8A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_waterpledge", 1, WaterpledgeDefinition);

function waterpledgeNum(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function waterpledgeAlpha(alpha: number, rgb: number): number {
    return ((Math.round(Math.max(0, Math.min(255, alpha))) << 24) | rgb) | 0;
}

/** 水印／彩虹／湿地的真实边界与泥水边缘：按实际半径画地面圆环，并按 `data.remaining`／`data.life` 渐隐。 */
WorldCombatClient.scene("world_combat:move_waterpledge_field", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; radius?: number; scale?: number; remaining?: number; life?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.4, waterpledgeNum(data.radius, 1.6));
    const life = Math.max(1, waterpledgeNum(data.life, 1));
    const left = Math.max(0, Math.min(1, waterpledgeNum(data.remaining, life) / life));
    const moment = data.moment || "scar";
    const rgb = moment === "rainbow" ? 0xFFF0B0 : moment === "wetland" ? 0x6A5230 : 0x66CCEE;
    const pulse = 0.7 + 0.3 * Math.sin(frame.serverTick() * 0.18);
    const alpha = 24 + 96 * left * pulse;
    frame.ring(entry.position[0], entry.position[1] + 0.045, entry.position[2], radius, waterpledgeAlpha(alpha, rgb));
    // 湿地再画一圈略高的边缘，让泥水边界与纯水印分得开。
    if (moment === "wetland")
        frame.ring(entry.position[0], entry.position[1] + 0.11, entry.position[2], Math.max(0.15, radius - 0.2), waterpledgeAlpha(alpha * 0.8, 0x4E6B3A));
    else
        frame.ring(entry.position[0], entry.position[1] + 0.03, entry.position[2], Math.max(0.15, radius - 0.14), waterpledgeAlpha(alpha * 0.5, rgb));
});

/** 彩虹的真正弧冠：沿实际半径架起两道交叉的七色半圆，随场地剩余渐隐。 */
WorldCombatClient.scene("world_combat:move_waterpledge_crown", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ radius?: number; remaining?: number; life?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.7, waterpledgeNum(data.radius, 1.6));
    const life = Math.max(1, waterpledgeNum(data.life, 1));
    const left = Math.max(0, Math.min(1, waterpledgeNum(data.remaining, life) / life));
    const rise = Math.max(0.8, radius * 0.8);
    const bands = [0xFF3B30, 0xFF9500, 0xFFD60A, 0x34C759, 0x32ADE6, 0x5856D6, 0xAF52DE];
    const segments = 26;
    for (let plane = 0; plane < 2; plane++) {
        const axis = plane === 0 ? 0 : 1;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments, angle = t * Math.PI;
            const x = entry.position[0] + (axis === 0 ? Math.cos(angle) * radius : Math.sin(angle) * radius * 0.18);
            const z = entry.position[2] + (axis === 1 ? Math.cos(angle) * radius : Math.sin(angle) * radius * 0.18);
            const y = entry.position[1] + Math.sin(angle) * rise + 0.12;
            const rgb = bands[Math.min(bands.length - 1, Math.floor(t * bands.length))];
            const alpha = (60 + 150 * left) * (0.55 + 0.45 * Math.sin(angle));
            frame.sprite("cobblemon:particle/generic/sparkle/glowingsparkle", x, y, z,
                0.14 + 0.05 * Math.sin(angle), frame.serverTick() * 0.4 + i * 5, waterpledgeAlpha(alpha, rgb), 0, true);
        }
    }
});
