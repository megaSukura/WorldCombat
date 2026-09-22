/**
 * 磨爪 / honeclaws 的客户端表现。
 *
 * 一句话：爪边先聚起一圈冷光 → 施术者原地交叠着刮几下，每一刮甩出一片爪痕与几点暖火星 → 锋口定住的一刻，
 * 爪上亮起一小簇金点；此后锋口还在的时间里，爪边一直有极淡的冷光轻轻闪。
 * 色相家族：冷钢白 0xE8F2FF 为爪痕主体，青灰 0xA9BEDC 作余韵与脚下，暖火星 0xFFC98A 与金 0xFFE9A8 只落在细节与强调层。
 * 拍子：起（draw 0–14t）→ 磨（hone 0–26t）→ 存（hum 持续）→ 收（fade）。
 * 范围：本招作用在自己身上，全部绑 `source`（随体型缩放），画面贴着施术者的爪与身侧，不落到远处。
 * 运动：draw 冷光向内聚拢；hone 爪痕向外甩开、火星带一点重力下落、金点向外一亮；hum 冷光极慢上浮；fade 火星向下沉。
 * 数：爪痕与火星的数量绑 `data.scrapes`（物攻与速度派生），强调的金点数绑 `data.shine`（本次实际抬起的级数派生）；
 *   刮得越密、抬得越多，画面里的粒子越多。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HoneClawsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 12, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.3, 0.07],
                    color: 0xD8E4F0, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_spark", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 13], size: [0.06, 0.02], sizeMode: "sin",
                    color: 0xF0F6FF, alpha: [0.7, 0], light: "full", maxParticles: 36
                }
            ]
        },
        hone: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "claw_marks", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "scrapes", fallback: 14 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.3], spin: 10,
                    lifetime: [8, 15], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xE8F2FF, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "whet_sparks", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "scrapes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.05, drag: 0.9,
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xFFC98A, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "edge_glint", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "shine", fallback: 6 } },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xFFE9A8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        hum: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "edge_aura", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 28], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0xD8E4F0, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 20
                },
                {
                    name: "claw_glint", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    rate: 1, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.004, 0.012],
                    lifetime: [14, 22], size: [0.06, 0.01], sizeMode: "sin",
                    color: 0xF0F6FF, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 22,
            exit: { stop: 7, drain: 15 },
            emitters: [
                {
                    name: "shed_sparks", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.02, 0.05], gravity: 0.02,
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xA9BEDC, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_honeclaws", 1, HoneClawsDefinition);
