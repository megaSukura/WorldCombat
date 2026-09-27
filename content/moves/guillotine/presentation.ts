/**
 * 断头钳 / guillotine 的客户端表现。
 *
 * 一句话：两片大钳在身侧张开、齿缝透出寒光，身前一段扇形被描出来；随后两钳缘沿左右短弧逐刻收口，
 *   合拢的一刻在钳口里第一个敌人身上交错咬合、崩出一圈碎屑；夹空则两片钳口在空处"咔"地闭上。
 * 色相家族：骨白与铁灰（0xB0A48C / 0xE8E2D2 / 0x8A8272）为主体，近白 0xFFFFFF 只给咬合那一下的核心——
 *   只有一种色相，冷硬、干净，与地裂的土黄、角钻的金属暖调、绝对零度的青蓝分开。
 * 拍子：起（windup 钳口张开）→ 收口（自定义场景逐帧画当刻钳缘）→ 击（snap 咬合 / miss 空合）。
 * 主体：两钳缘由自定义场景 `world_combat:move_guillotine/jaw` 每帧按服务端当刻的真实钳缘端点画出，
 *   与判定共用同一组几何；预算足够收尾的目标再点出一个可处决标识。粒子只作尘与咬合碎屑。
 * 范围：判定与画面同为 `data.span` 半径、`data.arc` 张角；`data.scale = 实际钳口长度 / 2.4`。
 * 数：`data.grip`（物攻派生）决定咬合碎屑密度，`data.intensity`（重夹伤害派生）抬高亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const GuillotineDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "open", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 4, at: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06], spin: 20,
                    lifetime: [8, 16], size: [0.34, 0.1],
                    color: 0xE8E2D2, alpha: [0.6, 0], light: "world", maxParticles: 16
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.8, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "maw", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "grip", fallback: 18 }, shape: { kind: "sector", radius: { data: "span", fallback: 2.4 }, angleDegrees: { data: "arc", fallback: 130 } },
                    direction: "outward", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A8272, alpha: [0.4, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rim", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    rate: 22, shape: { kind: "sector", radius: { data: "span", fallback: 2.4 }, angleDegrees: { data: "arc", fallback: 130 }, innerRadius: { data: "span", fallback: 2.4 } },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0xB0A48C, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        },
        snap: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "bite", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "grip", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.5], spread: 26,
                    lifetime: [6, 12], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "shear", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.28], spread: 30, spin: 40,
                    lifetime: [8, 16], size: [0.34, 0.08],
                    color: 0xE8E2D2, alpha: [0.9, 0], light: "world", maxParticles: 24
                },
                {
                    name: "clasp", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grab",
                    burst: { count: 3, at: 1 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.4, 0.12],
                    color: 0xB0A48C, alpha: [0.8, 0], light: "world", maxParticles: 10
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "snip", bind: "point", offset: [0, 0.7, 0], height: 0, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/slash",
                    burst: { count: 4, at: 1 }, shape: { kind: "line", length: 1.6 },
                    direction: "shape", speed: [0.02, 0.12], spin: 20,
                    lifetime: [6, 12], size: [0.24, 0.05],
                    color: 0xE8E2D2, alpha: [0.5, 0], light: "world", maxParticles: 12
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], spread: 14,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x8A8272, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_guillotine", 1, GuillotineDefinition);

function guillotineTriple(value: any): number[] | null {
    if (Array.isArray(value) && value.length >= 3) {
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        if (isFinite(x) && isFinite(y) && isFinite(z)) return [x, y, z];
    }
    return null;
}
function guillotineNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

// Both native contact edges arrive as world endpoints, already clipped to the first body or wall.
WorldCombatClient.scene("world_combat:move_guillotine/jaw", 1, frame => {
    const entry: CombatSceneEntry<any> = JSON.parse(frame.data()), data = entry.data || {};
    if (entry.lifecycle || data.lifecycle || !Array.isArray(data.blades)) return;
    const radius = Math.max(.1, Math.min(.22, Number(data.radius) || .12));
    data.blades.forEach((blade: number[][]) => {
        if (!Array.isArray(blade) || blade.length !== 2) return;
        const a = blade[0], b = blade[1];
        frame.line(a[0], a[1], a[2], b[0], b[1], b[2], 0xFFE8E2D2 | 0);
        for (const side of [-1, 1]) frame.line(a[0], a[1] + side * radius, a[2], b[0], b[1] + side * radius, b[2], 0xC0B0A48C | 0);
        frame.line(b[0], b[1] - radius, b[2], b[0], b[1] + radius, b[2], 0xFFF8F0DC | 0);
    });
});
