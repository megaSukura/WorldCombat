/**
 * 火之誓约 / firepledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈熔红的誓约符文，随后一根火柱从真实地面拔起把柱内的人烧着，柱脚只留一圈短寿的炭红印记
 *   （共鸣标记，本身不灼烧）；只有与草／水真正共鸣时，同一圈印才就地铺开翻涌的火海，或升起一道真正的虹彩弧冠。
 * 色相家族：橙红到亮黄（flame／ember／impact_fire／floorscorch）；彩虹时刻才引入虹彩第二色相
 *   （glowingsparkle 上色后的七色弧冠），与三誓约里草（绿）、水（青蓝）分开。
 * 拍子：起（mark，提交前的地面符文）→ 击（erupt 火柱 + hit 命中点）→ 留（scar 短印，或 seaoffire／rainbow 组合场）。
 * 范围：mark／scar／seaoffire／rainbow 的花环半径 = `data.scale` × 参考 1.7 格（= 实际誓约印半径）；
 *   erupt 的柱体 shape 直接绑定 `data.radius`／`data.height`，玩家看到的那根柱就是实际判定柱。
 * 归属：scar／seaoffire／rainbow 三个阶段 duration 0（活到服务器释放 key），随真实场地效果一起结束；
 *   边界／剩余由自定义场景 move_firepledge_field 画真实半径圆环并按 `data.remaining`／`data.life` 渐隐；
 *   彩虹弧冠由自定义场景 move_firepledge_crown 沿真实半径画成，不再只是一把上升的星点。
 * 数：`data.count` 驱动 erupt 火星、scar 贴地焦痕与火海粒子的数量；`data.moment` 由服务端按同一印记的实际组合态选择。
 */
const FirepledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.7 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0xFF7A2A, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "rune_heat", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xFFC24A, alpha: [0.8, 0], light: "full", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_core", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "count", fallback: 70 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "shape", speed: [0.05, 0.35],
                    lifetime: [10, 18], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFF9A3A, alpha: [0.85, 0], light: "full", bloom: 0.6, maxParticles: 420
                },
                {
                    name: "column_flame", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 220,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "up", speed: [0.08, 0.5],
                    lifetime: [10, 20], size: [0.24, 0.04],
                    color: 0xFFB03A, alpha: [0.9, 0], gravity: -0.02, drag: 0.95, light: "full", maxParticles: 520
                },
                {
                    name: "column_embers", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.4 } },
                    direction: "shape", speed: [0.12, 0.6],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD36A, alpha: [0.95, 0], gravity: 0.03, drag: 0.95, light: "full", maxParticles: 340
                },
                {
                    name: "scorch_ring", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [1.0, 1.4],
                    color: 0x8A3A18, alpha: [0.55, 0], light: "world", maxParticles: 8
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6
                },
                {
                    name: "sparks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.45],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xFFD06A, alpha: [0.95, 0], gravity: 0.04, light: "full"
                }
            ]
        },
        scar: {
            duration: 0,
            exit: { drain: 26 },
            emitters: [
                {
                    name: "ember_floor", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "count", fallback: 14 }, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xE2621E, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "heat_low", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 10, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 28], size: [0.26, 0.5],
                    color: 0x7A2E14, alpha: [0.28, 0], light: "world", maxParticles: 40
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
                    rate: 90, shape: { kind: "circle", radius: 1.7 },
                    direction: "shape", speed: [0.04, 0.22],
                    lifetime: [12, 22], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFF8A2A, alpha: [0.8, 0], gravity: -0.008, drag: 0.95, light: "full", maxParticles: 320
                },
                {
                    name: "sea_embers", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 80 }, interval: 6, repeats: 5 },
                    shape: { kind: "circle", radius: 1.7 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [12, 24], size: [0.09, 0.02],
                    color: 0xFFD06A, alpha: [0.9, 0], gravity: 0.03, light: "full", maxParticles: 300
                },
                {
                    name: "sea_pulse", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 12, at: 0, interval: 12, repeats: 3 },
                    shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [14, 22], size: [0.5, 0.14],
                    color: 0xFF6A26, alpha: [0.5, 0], light: "full", maxParticles: 60
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
                    rate: 16, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFFD7EE, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "rainbow_motes", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 18, shape: { kind: "circle", radius: 1.7 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firepledge", 1, FirepledgeDefinition);

function firepledgeNum(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}
function firepledgeAlpha(alpha: number, rgb: number): number {
    return ((Math.round(Math.max(0, Math.min(255, alpha))) << 24) | rgb) | 0;
}

/** 火印／火海／彩虹的真实边界：按实际半径画地面圆环，并按 `data.remaining`／`data.life` 渐隐。 */
WorldCombatClient.scene("world_combat:move_firepledge_field", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ moment?: string; radius?: number; scale?: number; remaining?: number; life?: number;
        lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.4, firepledgeNum(data.radius, 1.7));
    const life = Math.max(1, firepledgeNum(data.life, 1));
    const left = Math.max(0, Math.min(1, firepledgeNum(data.remaining, life) / life));
    const moment = data.moment || "scar";
    const rgb = moment === "rainbow" ? 0xFFF0B0 : moment === "seaoffire" ? 0xFF8A2A : 0xE2621E;
    const pulse = 0.7 + 0.3 * Math.sin(frame.serverTick() * 0.18);
    const alpha = 24 + 96 * left * pulse;
    frame.ring(entry.position[0], entry.position[1] + 0.045, entry.position[2], radius, firepledgeAlpha(alpha, rgb));
    frame.ring(entry.position[0], entry.position[1] + 0.03, entry.position[2], Math.max(0.15, radius - 0.14), firepledgeAlpha(alpha * 0.55, rgb));
});

/** 彩虹的真正弧冠：沿实际半径架起两道交叉的七色半圆，随场地剩余渐隐。 */
WorldCombatClient.scene("world_combat:move_firepledge_crown", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry<{ radius?: number; remaining?: number; life?: number; lifecycle?: { reason?: string } }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    if (data.lifecycle) return;
    const radius = Math.max(0.7, firepledgeNum(data.radius, 1.7));
    const life = Math.max(1, firepledgeNum(data.life, 1));
    const left = Math.max(0, Math.min(1, firepledgeNum(data.remaining, life) / life));
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
                0.14 + 0.05 * Math.sin(angle), frame.serverTick() * 0.4 + i * 5, firepledgeAlpha(alpha, rgb), 0, true);
        }
    }
});
