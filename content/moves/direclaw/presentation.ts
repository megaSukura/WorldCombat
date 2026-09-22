/**
 * 克命爪 / direclaw 的客户端表现。
 *
 * 一句话：爪锋压上毒液、身前亮起三道冷光 → 一记深爪朝目标拉过去，伤口处犁开三道平行的爪痕并溅出毒液 →
 *   若余毒按进伤口，伤口上再浮起该余毒的一层（绿毒／黄麻／蓝眠三种 moment 各自一色）。
 * 色相家族：毒绿 0x9BE86B 与深创绿 0x4F7A2A 为主，中性伤口灰 0x2E3B2E 作底；
 *   余毒 moment 只有该状态一色——麻痹黄 0xFFE14D、睡眠蓝 0x8FA6C4，这是机制三选一在画面上的读法。
 * 拍子：起（windup 聚毒）→ 撕（rake 三道爪痕）→ 中（venom／numb／drowse 按进余毒，或 wound 只留伤口）→ 收。
 * 范围：rake 用 `data.path`（与服务端判定同一组顶点）画三道平行爪痕，画到的就是打到的那块窄面；
 *   `data.wound`／`data.cleave` 决定三道线分多开、多长。
 * 运动：起手毒液向内收；rake 沿爪痕由下往上拉、毒液向外溅并受重力下落；余毒浮起后缓慢消散。
 * 数：`data.venom`（物攻派生）决定毒液滴数与雾量，`data.intensity`（爪伤威力派生）抬亮命中那一下，
 *   `data.primary` 让中间那道爪痕更亮。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DireclawDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "venom_gather", bind: "source", offset: [0, 0.5, 0.32], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.09], gravity: 0.01,
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0x9BE86B, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "claw_glint", bind: "source", offset: [0, 0.55, 0.34], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 3, interval: 3, repeats: 2 },
                    shape: { kind: "line", length: 0.5, rotation: [0, 0, 90] },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.22, 0.03], sizeMode: "index",
                    color: 0xDFFFCF, alpha: [0.7, 0], light: "full", maxParticles: 18
                }
            ]
        },
        rake: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "gash", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 40, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [5, 11], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xDFFFCF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "shred", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    shape: { kind: "polyline" },
                    rate: 26, direction: "shape", speed: [0.04, 0.16], spread: 12, spin: 20,
                    lifetime: [6, 12], size: [0.2, 0.03],
                    color: 0x9BE86B, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "spray", bind: "point", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "venom", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 18, gravity: 0.03,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x9BE86B, alpha: [0.85, 0], light: "full", maxParticles: 80
                }
            ]
        },
        venom: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "press", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "venom", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.22], spread: 16,
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xCFFF9B, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "ooze", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.02,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0x9BE86B, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        numb: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cramp", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "venom", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFF6C0, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        drowse: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "lull", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: 5, interval: 4, repeats: 4 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.16, 0.03],
                    color: 0x8FA6C4, alpha: [0.75, 0], light: "full", maxParticles: 26
                },
                {
                    name: "bubble", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xCFE0F5, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        wound: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "seam", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/chemicalsplash",
                    burst: { count: { data: "venom", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.02,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FB07A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "vital", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3], spread: 14,
                    lifetime: [6, 12], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xEFFFD8, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 40
                },
                {
                    name: "streak", bind: "point", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], spin: 26,
                    lifetime: [5, 10], size: [0.2, 0.03],
                    color: 0x9BE86B, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "spill", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: { data: "venom", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x7C9C68, alpha: [0.5, 0], maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_direclaw", 1, DireclawDefinition);
