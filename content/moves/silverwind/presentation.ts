/**
 * 银色旋风 / silverwind —— 客户端表现。
 *
 * 一句话：翅缘亮起银光、鳞粉朝翅上聚起 → 一大扇银鳞沿服务端给的扇面顶点向前铺开、缓缓往前飘 →
 * 被割到的敌人身上炸开一撮银粉 → 回卷的鳞粉落在施法者身上时升起一圈银白光环。
 * 色相家族：银白与浅青（powder / sparkle / flying_bugs 为主体，0xC9D8E6、0xEDF2FA），中性尘（tinydust）只做余韵。
 * 拍子：起 gather（聚鳞）→ 扇 blow（扇面铺开）→ hit（逐个割到）→ 涌 surge／空 miss。
 * 范围：blow 用与服务端判定同源的扇形顶点（圆心＋外缘弧）画出整扇——`polygon` 填面、`polyline` 描边；
 *   顶点在瞄准所在的平面上，可指向上或下，外缘顶点被墙截在真实碰点，扇面多大、站哪会被割到，画面就是那块区域。
 * 运动：鳞粉沿扇面从翅缘向外飘，飘速慢、受轻微重力下落；晶点沿扇缘更快地掠出。
 * 数：`data.scales`（特攻与等级换算）绑定鳞粉与晶点的数量，`data.span`／`data.reach` 决定扇面几何，
 *   `data.intensity`（本次威力比例）缩放发射量，`data.stages`（反哺级数）绑定反哺光环的数量。
 */
const SilverwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_scales", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xC9D8E6, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_glint", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0xEDF2FA, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        blow: {
            duration: 26,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "scales", fallback: 26 }, shape: { kind: "polygon" },
                    direction: "away", speed: [0.05, 0.18], drag: 0.92,
                    gravity: 0.008,
                    lifetime: [14, 26], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xC9D8E6, alpha: [0.55, 0], light: "world", maxParticles: 220
                },
                {
                    name: "fan_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: { data: "scales", fallback: 26 }, shape: { kind: "polyline" },
                    direction: "away", speed: [0.08, 0.3], drag: 0.9,
                    lifetime: [8, 16], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 140
                },
                {
                    name: "fan_bugs", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: { data: "scales", fallback: 26 }, interval: 4, repeats: 3 },
                    shape: { kind: "polygon" },
                    direction: "away", speed: [0.1, 0.34], drag: 0.9,
                    lifetime: [10, 20], size: [0.16, 0.03],
                    color: 0xC9D8E6, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_burst", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "scales", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 20,
                    lifetime: [7, 14], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEDF2FA, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "hit_scales", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "scales", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.1, 0.34], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xC9D8E6, alpha: [0.8, 0], light: "world", maxParticles: 140
                }
            ]
        },
        surge: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.08, 0], height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 17], size: [0.3, 0.6],
                    color: 0xEDF2FA, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "surge_up", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "stages", fallback: 1 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.08, 0.28], drag: 0.9,
                    lifetime: [8, 15], size: [0.13, 0.03],
                    color: 0xEDF2FA, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "scales", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.88,
                    lifetime: [9, 16], size: [0.05, 0.02],
                    color: 0x8C94A3, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_silverwind", 1, SilverwindDefinition);
