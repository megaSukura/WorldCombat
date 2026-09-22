/**
 * 水蒸气 / hydrosteam 的客户端表现。
 *
 * 一句话：水在施法者身前烧开、白汽先聚后炸（起）→ 一条向外张开的蒸汽扇面喷出，白汽翻滚、底部透着烫红，
 *   扇面里被罩住的人各炸开一团蒸汽与水花（击）→ 白汽缓缓升散（收）。
 * 色相家族：近白到灰的蒸汽为主体、大面积低饱和；烫红（0xE0662A）只出现在扇面底部与命中核心的小面积上。
 * 拍子：起（boil 烧开）→ 击（burst 张开扇面、scald 命中）→ 收（余汽上升）。
 * 范围：扇面的顶点由服务端按机制 reach/angle 生成（`data.path`），画面画的就是判定罩住的那块扇面。
 * 运动：白汽沿扇面径向由内向外翻涌，越远越淡；水花受重力下落。
 * 数：`data.vapor`（特攻派生的白汽量）决定密度，`data.sunlight`（是否强日照）决定亮度与浓淡，画面里的数与机制一致。
 */
const HydroSteamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        boil: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "bubbles", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xEAF4F8, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "steam_up", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "vapor", fallback: 20 }, shape: { kind: "cylinder", radius: 0.45, length: 0.8 },
                    direction: "up", speed: [0.03, 0.14], drag: 0.92, spin: 4,
                    lifetime: [12, 22], size: [0.34, 0.12],
                    color: 0xF2F7FA, alpha: [0.4, 0], light: "world", maxParticles: 70
                },
                {
                    name: "heat", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xE0662A, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "vapor", fallback: 20 }, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.06, 0.26], spread: 20, drag: 0.9, spin: 6,
                    lifetime: [12, 24], size: [0.42, 0.14],
                    color: 0xF2F7FA, alpha: [0.4, 0], light: "world", maxParticles: 240
                },
                {
                    name: "fan_edges", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "vapor", fallback: 18 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.08, 0.3], spread: 14,
                    lifetime: [6, 13], size: [0.16, 0.04],
                    color: 0xD6ECF4, alpha: [0.7, 0], light: "full", maxParticles: 160
                },
                {
                    name: "hot_core", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "sunlight", fallback: 0 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xE0662A, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "droplets", bind: "path", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 40, shape: { kind: "polygon" },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.06, drag: 0.93,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xEAF4F8, alpha: [0.55, 0], light: "world", maxParticles: 140
                }
            ]
        },
        scald: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "vapor", fallback: 20 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26, gravity: 0.05, drag: 0.92,
                    lifetime: [8, 16], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xF2F7FA, alpha: [0.95, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cloud", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "vapor", fallback: 16 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.14], drag: 0.92, spin: 5,
                    lifetime: [14, 26], size: [0.34, 0.12],
                    color: 0xEAF4F8, alpha: [0.4, 0], light: "world", maxParticles: 50
                },
                {
                    name: "thaw", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "thawed", fallback: 0 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0xFFF2D8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hydrosteam", 1, HydroSteamDefinition);
