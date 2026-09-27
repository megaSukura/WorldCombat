/**
 * 精神转移 / psychoshift 的客户端表现。
 *
 * 一句话：施法者身上那层异常被念力从边缘剥下、抽成几颗病核 → 病核沿两人连线射向对手、钻进去炸开一团暗色的病光 →
 *   施法者身上随之收干净。
 * 色相家族：超能紫 0x8A5CF0 作搬运的念力，近黑 0x241C0A 落强调层；异常本体取 `data.color`——按实际种下的
 *   异常（灼伤橙／中毒绿／剧毒紫／麻痹黄／睡眠靛／冰冻青）取色，深种显示的是毒转剧毒后的最终色。
 * 拍子：起（draw 0–16t）→ 击（push 0–24t，整条连线同刻亮起，不拖飞行）→ 落（plant 0–30t）→ 收；免疫／作废另走 fizzle／immune。
 * 范围：draw/push 的病核沿 `data.path`（施法者与目标两个实体顶点画的 polyline）——抽取绑施法者，落身绑目标。
 *   转移本身在一刻内完成，push 是一次沿连线的瞬时爆发，不是逐刻推进的飞行。
 * 运动：病核从施法者身体边缘被拉出 → 连线同刻亮起 → 落身时向内钻入并炸开 → 余韵下沉。
 * 数：病核数绑 `data.motes`（特攻与等级派生），落身强度绑 `data.intensity`（转移强度派生）。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const PsychoShiftDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 16,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "draw_peel", bind: "source", fit: "body", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 8 },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [9, 15], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x8A5CF0, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "draw_mote", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: { data: "motes", fallback: 8 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.11, 0.02], sizeMode: "index",
                    color: { data: "color", fallback: 0xB8D14A }, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        push: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "push_mote", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 }, direction: "shape", speed: [0.22, 0.5], spread: 4,
                    lifetime: [8, 14], size: [0.13, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0xB8D14A }, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "push_trail", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    burst: { count: 8, at: 0 }, direction: "shape", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0x8A5CF0, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        plant: {
            duration: 30,
            exit: { stop: 11, drain: 19 },
            emitters: [
                {
                    name: "plant_burst", bind: "target", fit: "body", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 8 }, at: 1, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.26], drag: 0.92,
                    lifetime: [8, 15], size: [0.13, 0.03], sizeMode: "index",
                    color: { data: "color", fallback: 0xB8D14A }, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "plant_soak", bind: "target", fit: "body", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 6, at: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [12, 20], size: [0.22, 0.35],
                    color: 0x241C0A, alpha: [0.45, 0], light: "world", render: "translucent", maxParticles: 20
                },
                {
                    name: "plant_seal", bind: "target", fit: "body", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [12, 20], size: [0.28, 0.8], sizeMode: "sin",
                    color: { data: "color", fallback: 0x6E5A2A }, alpha: [0.6, 0], light: "world", maxParticles: 14
                }
            ]
        },
        immune: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "immune_puff", bind: "target", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 9 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.02, 0.09], drag: 0.9,
                    lifetime: [12, 20], size: [0.16, 0.32],
                    color: 0x8A8172, alpha: [0.3, 0], light: "world", render: "translucent", maxParticles: 22
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "source", fit: "body", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 7 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 20], size: [0.15, 0.3],
                    color: 0x8A8172, alpha: [0.28, 0], light: "world", render: "translucent", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychoshift", 1, PsychoShiftDefinition);
