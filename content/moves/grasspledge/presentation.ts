/**
 * 草之誓约 / grasspledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈青绿的藤纹符文，随后一丛兜绕上升的藤蔓从真实地面炸土而出把敌人缠住，柱脚只留一圈短寿的
 *   藤印（共鸣标记，本身不拖慢）；只有与火／水真正共鸣时，同一圈印才就地铺开翻涌的火海，或塌成一汪露出泥水边缘的
 *   湿地。命中者脚边只在真正被缠住时绕上短根须，控制被拒绝时只落几片叶子。
 * 色相家族：黄绿到深绿（sprout／leaf／razorleaf／seed／impact_grass）；火海时刻引入橙红（与火之誓约一致），
 *   湿地时刻引入土褐与青蓝（mudbubble／water_ripple），与三誓约的第三色相分开。
 * 拍子：起（mark 地面藤纹）→ 击（erupt 草柱 + hit 命中点，缠住时绕根、拒绝只落叶）→ 留（scar 短印，或 seaoffire／wetland 组合场）。
 * 范围：mark／scar／seaoffire／wetland 的花环半径 = `data.scale` × 参考 1.8 格（= 实际誓约印半径）。
 * 主体：erupt 的柱体粒子之外，自定义场景 move_grasspledge_vine 按真实 `radius`／`height` 盘绕上升，读得出「缠人的藤体」；
 *   命中被缠者由自定义场景 move_grasspledge_roots 绕着脚部画短根须，拒绝时只落叶子。
 * 归属：scar／seaoffire／wetland 三个阶段 duration 0（活到服务器释放 key），随真实场地效果一起结束；
 *   边界由自定义场景 move_grasspledge_field 画真实半径圆环并按 `data.remaining`／`data.life` 渐隐。
 * 数：`data.count`（由特攻与地面盘根数量派生）决定草叶、贴地盘根与组合场的粒子数量。
 */
const GrasspledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.8 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0x8FD45A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rune_leaf", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "ring", radius: 1.6 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_sprout", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.05, 0.35],
                    lifetime: [12, 22], size: [0.4, 0.06], sizeMode: "index",
                    color: 0x7FC24A, alpha: [0.85, 0], light: "world", maxParticles: 380
                },
                {
                    name: "column_leaves", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 200,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.1, 0.5],
                    lifetime: [12, 24], size: [0.22, 0.04],
                    color: 0x4E8A2A, alpha: [0.9, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 520
                },
                {
                    name: "column_seeds", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "count", fallback: 50 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.4 }, length: { data: "height", fallback: 3.6 } },
                    direction: "shape", speed: [0.12, 0.55],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xCDE88A, alpha: [0.9, 0], gravity: 0.05, drag: 0.95, light: "world", maxParticles: 300
                },
                {
                    name: "soil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.4 } },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 18], size: [0.3, 0.05],
                    color: 0x6A4A2A, alpha: [0.7, 0], gravity: 0.03, light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "binding", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "binding", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.08, 0.35],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x8FD45A, alpha: [0.9, 0], light: "world"
                }
            ]
        },
        scar: {
            duration: 0,
            exit: { drain: 26 },
            emitters: [
                {
                    name: "tangle", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "count", fallback: 14 }, shape: { kind: "circle", radius: 1.8 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0x6FA83A, alpha: [0.65, 0], light: "world", maxParticles: 90
                },
                {
                    name: "creeper", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 8, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.005, 0.02],
                    lifetime: [18, 30], size: [0.12, 0.02],
                    color: 0x3F6A22, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        seaoffire: {
            duration: 0,
            exit: { drain: 30 },
            emitters: [
                {
                    name: "sea_flames", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 80, shape: { kind: "circle", radius: 1.8 },
                    direction: "shape", speed: [0.04, 0.22],
                    lifetime: [12, 22], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.8, 0], gravity: -0.008, drag: 0.95, light: "full", maxParticles: 300
                },
                {
                    name: "sea_embers", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 80 }, interval: 6, repeats: 5 },
                    shape: { kind: "circle", radius: 1.8 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD06A, alpha: [0.9, 0], gravity: 0.03, light: "full", maxParticles: 300
                },
                {
                    name: "sea_pulse", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 12, at: 0, interval: 12, repeats: 3 },
                    shape: { kind: "ring", radius: 1.8 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 22], size: [0.5, 0.14],
                    color: 0xFF6A26, alpha: [0.5, 0], light: "full", maxParticles: 60
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
                    rate: 30, shape: { kind: "circle", radius: 1.8 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 30], size: [0.18, 0.03],
                    color: 0x6A5230, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "wet_pulse", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "circle", radius: 1.8 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x7FB8A8, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "reeds", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x5E8A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grasspledge", 1, GrasspledgeDefinition);

function grasspledgeNum(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function grasspledgeClamp(value: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, value));
}
function grasspledgeAlpha(alpha: number, rgb: number): number {
    return ((Math.round(grasspledgeClamp(alpha, 0, 255)) << 24) | rgb) | 0;
}

/** 草印／组合的真实边界：按实际半径画地面圆环，湿地再加一圈泥水边缘，并按 `data.remaining`／`data.life` 渐隐。 */
WorldCombatClient.scene("world_combat:move_grasspledge_field", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; radius?: number; scale?: number; remaining?: number; life?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.4, grasspledgeNum(data.radius, 1.8));
    const life = Math.max(1, grasspledgeNum(data.life, 1));
    const left = Math.max(0, Math.min(1, grasspledgeNum(data.remaining, life) / life));
    const moment = data.moment || "scar";
    const rgb = moment === "seaoffire" ? 0xFF8A2A : moment === "wetland" ? 0x6A5230 : 0x6FA83A;
    const pulse = 0.7 + 0.3 * Math.sin(frame.serverTick() * 0.18);
    const alpha = 24 + 96 * left * pulse;
    frame.ring(entry.position[0], entry.position[1] + 0.045, entry.position[2], radius, grasspledgeAlpha(alpha, rgb));
    if (moment === "wetland")
        frame.ring(entry.position[0], entry.position[1] + 0.11, entry.position[2], Math.max(0.15, radius - 0.2), grasspledgeAlpha(alpha * 0.8, 0x4E6B3A));
    else
        frame.ring(entry.position[0], entry.position[1] + 0.03, entry.position[2], Math.max(0.15, radius - 0.14), grasspledgeAlpha(alpha * 0.5, rgb));
});

/** 草柱主体：按真实 `radius`／`height` 从地面盘绕上升的藤体，随 `data.start`／`data.duration` 长出。 */
WorldCombatClient.scene("world_combat:move_grasspledge_vine", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ radius?: number; height?: number; count?: number; start?: number; duration?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.5, grasspledgeNum(data.radius, 1.4));
    const height = Math.max(1, grasspledgeNum(data.height, 3.6));
    const start = grasspledgeNum(data.start, frame.serverTick());
    const duration = Math.max(1, grasspledgeNum(data.duration, 26));
    const progress = grasspledgeClamp((frame.serverTick() - start) / duration, 0, 1);
    const grow = Math.min(1, progress * 1.15);
    const spriteFrame = Math.floor(frame.serverTick() * 0.5) % 6;
    const turns = 3, perTurn = 9;
    for (let turn = 0; turn < turns; turn++) {
        for (let s = 0; s < perTurn; s++) {
            const u = (turn + s / perTurn) / turns;
            if (u > grow) break;
            const angle = turn * Math.PI * 2 + (s / perTurn) * Math.PI * 2 + progress * 1.6;
            const r = radius * (0.85 + 0.15 * Math.sin(angle * 3));
            const x = entry.position[0] + Math.cos(angle) * r;
            const z = entry.position[2] + Math.sin(angle) * r;
            const y = entry.position[1] + 0.1 + u * height;
            frame.sprite("cobblemon:particle/generic/grass/sprout", x, y, z,
                0.2 + 0.12 * (1 - u), angle * 40, grasspledgeAlpha(200, turn % 2 ? 0x3F6A22 : 0x7FC24A), spriteFrame, false);
        }
    }
});

/** 命中者脚边：真正被缠住时绕上短根须；控制被拒绝时只落几片叶子。 */
WorldCombatClient.scene("world_combat:move_grasspledge_roots", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ target?: string; binding?: number; count?: number; start?: number; duration?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const anchorJson = data.target ? frame.anchor(data.target) : null;
    const anchor = anchorJson ? JSON.parse(anchorJson) : null;
    const x = anchor ? anchor.x : entry.position[0];
    const y = anchor ? anchor.y : entry.position[1];
    const z = anchor ? anchor.z : entry.position[2];
    const height = anchor ? Math.max(0.5, anchor.height) : 1.2;
    const start = grasspledgeNum(data.start, frame.serverTick());
    const duration = Math.max(1, grasspledgeNum(data.duration, 20));
    const progress = grasspledgeClamp((frame.serverTick() - start) / duration, 0, 1);
    const feet = y + 0.04, marks = Math.max(3, Math.min(7, Math.round(grasspledgeNum(data.count, 4))));
    if (grasspledgeNum(data.binding, 0) > 0) {
        for (let i = 0; i < marks; i++) {
            const angle = i * Math.PI * 2 / marks + 0.3;
            const reach = 0.34 + 0.08 * Math.sin(progress * Math.PI);
            frame.line(x + Math.cos(angle) * reach, feet + 0.02, z + Math.sin(angle) * reach,
                x + Math.cos(angle) * 0.08, feet + 0.14, z + Math.sin(angle) * 0.08, grasspledgeAlpha(210, 0x3F6A22));
            frame.line(x + Math.cos(angle + 0.6) * reach * 0.8, feet + 0.22, z + Math.sin(angle + 0.6) * reach * 0.8,
                x + Math.cos(angle) * 0.06, feet + 0.34, z + Math.sin(angle) * 0.06, grasspledgeAlpha(170, 0x6FA83A));
        }
        frame.sprite("cobblemon:particle/generic/grass/sprout", x, feet + 0.1, z, 0.24,
            0, grasspledgeAlpha(220, 0x8FD45A), Math.floor(frame.serverTick() * 0.4) % 6, false);
        return;
    }
    for (let i = 0; i < marks; i++) {
        const fall = (progress * 1.4 + i * 0.23) % 1;
        const angle = i * 2.1;
        frame.sprite("cobblemon:particle/generic/grass/smallleaf", x + Math.cos(angle) * 0.28,
            feet + height * 0.75 * (1 - fall) + 0.1, z + Math.sin(angle) * 0.28,
            0.12 + 0.04 * fall, angle * 40, grasspledgeAlpha(200 * (1 - fall), 0x8FD45A), 0, false);
    }
});
