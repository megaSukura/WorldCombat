/**
 * 挡路 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：术者沉腰张臂，脚边卷起一圈尘土；一道冷光先沿拟建弧线探出退路的位置，落墙时一排青灰栅栏立柱
 *   贴着弧线冲天立起，真正被墙压住的敌人在墙根被踹起一撮土；墙基贴着一条冷光，直到封锁解除、栅栏收回。
 *
 * 色相家族：青灰钢蓝（0x8FA1B0／0xC7D3DD）为主，脚下的尘土只用原色 earth／tinydust 作中性底色。
 *   亮蓝白只出现在落栅冲击的小面积高光，不引入第二个色相。
 * 层次：起势（起手，拟建弧＋脚边聚尘）→ 立栅＋墙基（击）→ 贴地冷光（持续）→ 推挤（被墙压住者）→ 收栅（余韵）。
 * 起击收：windup（拟建弧）→ seal（落栅）→ press（贴墙者被推）→ penned（封锁还在）→ fold（收栅）。
 * 范围：windup 的 `plan_arc` 沿服务端给的拟建弧 `data.path` 画；seal／penned 的 `wall_base` 沿实际成功列
 *   的 `data.path` 工作——受阻失败的格不在折线里，画面直接留下缺口，和判定里那道墙同源。
 * 运动：立柱沿墙基折线向上迸发（impact_steel 沿 shape 播一遍），尘土从墙根向外翻起；拟建弧用贴地冷光缓慢呼吸。
 * 数：立柱根数由 `data.columns` 绑定发射量，冲击与墙基冷光随 `data.intensity`（根数／高度换算）加重。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const BlockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "plan_arc", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "columns", fallback: 6 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x8FA1B0, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 48
                },
                {
                    name: "brace_dust", bind: "source", height: 0.06, offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8FA1B0, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "brace_gather", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.03],
                    color: 0xC7D3DD, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        seal: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "wall_rise", bind: "path", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "columns", fallback: 6 }, repeats: 3, interval: 2 },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.05, 0.22],
                    lifetime: [10, 18], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xC7D3DD, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 150
                },
                {
                    name: "wall_base", bind: "path", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "columns", fallback: 6 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.1], gravity: 0.03, drag: 0.9,
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x8FA1B0, alpha: [0.5, 0], light: "world", maxParticles: 120
                },
                {
                    name: "seal_ring", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [14, 24], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xC7D3DD, alpha: [0.8, 0], light: "world", maxParticles: 30
                }
            ]
        },
        press: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "press_shove", bind: "target", height: 0.34,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 20, repeats: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x8FA1B0, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "press_dust", bind: "target", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "columns", fallback: 6 } },
                    shape: { kind: "circle", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x8FA1B0, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        penned: {
            duration: 0,
            exit: { stop: 0, drain: 24 },
            emitters: [
                {
                    name: "penned_line", bind: "path", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "columns", fallback: 6 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xC7D3DD, alpha: [0.5, 0], alphaMode: "sin", light: "world", maxParticles: 60
                }
            ]
        },
        fold: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fold_dust", bind: "point", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [14, 24], size: [0.16, 0.03],
                    color: 0x8FA1B0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0x8FA1B0, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_block", 1, BlockDefinition);
