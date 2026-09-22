/**
 * 空手劈 / karatechop 的客户端表现。
 *
 * 一句话：一道竖直的暖白线瞬间落在目标身上，刀口炸开一圈偏橙的碎屑；真切中要害时再闪一记亮白。
 * 色相家族：暖白与近白（slash／cut 的暖白偏色）＋斗系橙（impact_fighting 的一点强调）＋中性尘（tinydust）。
 * 拍子：劈（chop 竖线落下）→ 中（hit 刀口爆）→ 强调（crit 要害）；因为零起手，没有预示拍，起手即落。
 * 范围：chop 用 `data.path`（与服务端同一条从头顶到落点的竖线）画出这一刀的高度；线到哪就是劈到哪。
 * 运动：chop 沿竖线由上向下扫，hit 碎屑从落点向外爆。
 * 数：`data.shards`（物攻与速度换算）绑定竖线的密度与命中碎屑量；`data.scale` 让高大个体劈得更深。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const KaratechopDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        chop: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "edge_line", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline" },
                    rate: { data: "shards", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 6,
                    lifetime: [4, 9], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF1DC, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "edge_trail", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 16, direction: "shape", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.2, 0.04], spriteFrom: "random",
                    color: 0xD98A5A, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "wound", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.22], spread: 24,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFF1DC, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "chip", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.04, 0.14], gravity: 0.06, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xB8A492, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        crit: {
            duration: 22,
            exit: { stop: 7, drain: 13 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.5, 0.11],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 14
                },
                {
                    name: "vital_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 }, direction: "outward", speed: [0.08, 0.22], spread: 30,
                    lifetime: [8, 15], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xFFE6CC, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.03, 0.11],
                    lifetime: [8, 13], size: [0.05, 0.02],
                    color: 0xA89A8C, alpha: [0.3, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_karatechop", 1, KaratechopDefinition);
