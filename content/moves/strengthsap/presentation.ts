/**
 * 吸取力量 / strengthsap 的客户端表现。
 *
 * 一句话：施法者脚边聚起一圈根须，猛地搭上贴身对手；一条根须把对手与施法者连住，把对手身上橙色的力气
 *   一股股抽回、在施法者一侧化成绿光，对手身上散出被抽空的苍白丝。
 * 色相家族：草绿（0x8FC63F／0x3E7A1F）与嫩绿（0xC7E86A）撑起根须与回流，暖橙（0xF2A63C）只代表被抽走的攻势，
 *   近白（0xF2FBE0）只给被抽走的力气与命中核心。
 * 拍子：起（windup 聚根）→ 缠（latch 根须搭上、橙色攻势显出）→ 回（drain 力气回流并转绿）→ 虚（weaken 对手被抽空）。
 * 范围：latch／weaken 绑在目标身上，按体型适配；连线沿 `data.path` 把目标与施法者连成实线，读到的是这一次抽取的两端。
 * 运动：根须自施法者脚下向目标缠上；回流沿 `data.direction` 从目标流向施法者，橙色在外、绿色在内。
 * 数：力量丝数量由 `data.motes`（特攻派生）驱动；`data.sapped` 只在物攻真的被降下去时才在目标身上留下印记；
 *   `data.lit` 以实际回血为门槛点亮施法者一侧；`data.weakMotes` 由实际削弱级数派生。敌人不播伤血。
 * 参照节：视觉语言第一、二、三、四、七、九节。
 */
const StrengthSapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "roots", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 14, shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12], spin: 20,
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0x8FC63F, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "glow", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xC7E86A, alpha: [0.55, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        },
        latch: {
            duration: 24,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "coil", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.16], spin: 30,
                    lifetime: [9, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x5C9E2E, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "tether", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.0, 0.04], spread: 12,
                    lifetime: [8, 16], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xF2A63C, alpha: [0.7, 0], light: "full", maxParticles: 70
                },
                {
                    name: "knot", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "sapped", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 20,
                    lifetime: 8, size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF2FBE0, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 10
                }
            ]
        },
        drain: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.16, 0.4], spread: 8,
                    lifetime: [7, 15], size: [0.1, 0.02],
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "feed", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: { data: "lit", fallback: 0 } }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 20], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC7E86A, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        weaken: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "shorn", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "weakMotes", fallback: 0 } }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.16], gravity: -0.01, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xF2FBE0, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "sag", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.05, 0.01],
                    color: 0x8FA84E, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "miss", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02,
                    lifetime: [7, 14], size: [0.07, 0.01],
                    color: 0x8FA84E, alpha: [0.45, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_strengthsap", 1, StrengthSapDefinition);
