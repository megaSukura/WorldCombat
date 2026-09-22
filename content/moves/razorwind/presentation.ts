/**
 * 旋风刀 / razorwind 的客户端表现。
 *
 * 一句话：站定后一圈风刃在身周拧起、越积越多，随后整把扇子朝身前铺开，扇面里的目标被风刃扫出成片碎屑；
 * 真切中要害时再闪一记亮白。
 * 色相家族：淡青白与近白（swirlingwind／cut／swipe 的青白偏色）＋中性尘（tinydust）＋白色强调。
 * 拍子：蓄（charge 风刃绕身累积）→ 发（release 扇面铺开）→ 切（cut 命中爆）→ 强调（crit 要害）。
 * 范围：release 用 `data.path`（与服务端 WorldGeometry.polygon 同一组扇形顶点）铺满整个扇面；扇面多大画面就是那块。
 * 运动：charge 风刃绕身旋转并向内收，release 扇面由扇心向外扫开，cut 碎屑沿切口向外爆。
 * 数：`data.blades`（速度与特攻换算）绑定绕身风刃的发射量，`data.motes` 绑定扇面与命中的风屑量；
 *   `data.scale`／`data.intensity` 让散流式比集刃式更大更亮。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RazorwindDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 26 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "orbit", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: { data: "blades", fallback: 6 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.05],
                    color: 0xA8D8C0, alpha: [0.55, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "whet", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    rate: 12, shape: { kind: "sphere", radius: 0.9 }, direction: "inward", speed: [0.06, 0.16],
                    lifetime: [6, 12], size: [0.18, 0.04], spriteFrom: "random",
                    color: 0xE8F6EE, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polygon" }, rate: { data: "motes", fallback: 22 }, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.3, 0.06],
                    color: 0xDFF3E6, alpha: [0.3, 0], light: "full", maxParticles: 130
                },
                {
                    name: "fan_edge", bind: "path", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    shape: { kind: "polyline", closed: true },
                    rate: 30, direction: "shape", speed: [0.06, 0.18], spread: 6,
                    lifetime: [5, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 110
                }
            ]
        },
        cut: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wound", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "motes", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.22], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE6F6EC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "shred", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.04, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9FB8AA, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 16
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xEAFBF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "disperse", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6B8AE, alpha: [0.32, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_razorwind", 1, RazorwindDefinition);
