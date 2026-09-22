/**
 * 大扫除 / tidyup 的客户端表现。
 *
 * 一句话：施术者把扫具拢到身前、在脚边扫开 → 一圈圈清扫环贴着地面向外扩，尘屑被推向四周 →
 *   扫到的东西在原地碎开、向四面崩散 → 扫完一圈青亮的环从脚下荡起，轻快落地。
 * 色相家族：清扫米白 0xF2E9D8 为环与主体，尘灰 0xA79E8C 作扬尘与余韵，清亮青 0x9FE3D6 只落在轻快强调层。
 * 拍子：起（draw 0–14t）→ 扫（sweep 0–34t，按 sweeps 重放）→ 清（clear 0–30t）→ 提（rise 0–30t）→ 存（hum 持续）→ 收（fade）。
 * 范围：sweep/rise 的地面环绑 `point`、fit none，几何半径 3.2 按 `data.scale`（实际清扫半径 / 3.2）推出，
 *   画出的圈就是这一次真正扫到、也是判定会用到的范围。
 * 运动：draw 尘屑在脚边打转；sweep 清扫环一圈圈向外扩张、尘被推开；clear 被扫掉的东西向外崩散；rise 青环从脚下荡起；hum 尘屑极慢上浮；fade 落定。
 * 数：扬尘数绑 `data.debris`（物攻与速度派生），地面环重放次数绑 `data.sweeps`（速度派生），
 *   清场粒子数绑 `data.cleared`（执行时实际扫走的东西数）、轻快强调绑 `data.shine`（本次抬起的级数派生）；
 *   扫得越远越干净，画面里的粒子与碎屑越多。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const TidyUpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "draw_brush", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    rate: 8, shape: { kind: "arc", radius: 0.5, arcDegrees: 130 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [7, 13], size: [0.28, 0.07],
                    color: 0xF2E9D8, alpha: [0.5, 0], light: "full", maxParticles: 24
                },
                {
                    name: "draw_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.06], gravity: 0.01,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xA79E8C, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sweep: {
            duration: 34,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "sweep_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1, at: 1, interval: 7, repeats: { data: "sweeps", fallback: 2 } },
                    shape: { kind: "ring", radius: 3.2 },
                    direction: "outward", speed: [0.09, 0.24],
                    lifetime: [14, 24], size: [0.5, 1.05], sizeMode: "index",
                    color: 0xF2E9D8, alpha: [0.72, 0], light: "full", maxParticles: 12
                },
                {
                    name: "sweep_dust", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "debris", fallback: 16 }, at: 1 },
                    shape: { kind: "circle", radius: 3.2, thickness: 0.8 },
                    direction: "up", speed: [0.02, 0.07], gravity: 0.02,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xA79E8C, alpha: [0.55, 0], light: "world", maxParticles: 120
                },
                {
                    name: "sweep_wind", bind: "source", offset: [0, 0.1, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.1, 0.26],
                    lifetime: [7, 12], size: [0.26, 0.05],
                    color: 0xF7F1E4, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        clear: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "clear_burst", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "cleared", fallback: 0 }, at: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [7, 13], size: [0.3, 0.05],
                    color: 0xF2E9D8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "clear_bits", bind: "source", offset: [0, 0.2, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "cleared", fallback: 0 }, at: 1 },
                    shape: { kind: "ring", radius: 1.0 },
                    direction: "outward", speed: [0.1, 0.24], gravity: 0.05, spin: 14,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xA79E8C, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rise: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "rise_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 5, at: 1 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.07, 0.2],
                    lifetime: [12, 20], size: [0.42, 0.92], sizeMode: "index",
                    color: 0x9FE3D6, alpha: [0.75, 0], light: "full", maxParticles: 22
                },
                {
                    name: "rise_spark", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "shine", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x9FE3D6, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 2, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [16, 28], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0xA79E8C, alpha: [0.2, 0], alphaMode: "sin", light: "world", maxParticles: 16
                },
                {
                    name: "hum_glint", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 1.5, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.003, 0.012],
                    lifetime: [14, 24], size: [0.05, 0.01], sizeMode: "sin",
                    color: 0x9FE3D6, alpha: [0.24, 0], alphaMode: "sin", light: "full", maxParticles: 12
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 9, drain: 17 },
            emitters: [
                {
                    name: "fade_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "down", speed: [0.01, 0.04], gravity: 0.02,
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0xA79E8C, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tidyup", 1, TidyUpDefinition);
