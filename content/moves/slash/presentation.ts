/**
 * 劈开 / slash 的客户端表现。
 *
 * 一句话：举刃过头聚起一道亮线，随后一道窄而高的斜压刀面从高处斜下推进，命中处迸出碎屑；
 * 真劈中要害时，落点再闪一记更亮的白星。
 * 色相家族：近白与冷银（swipe／cut／impact_normal／bigsparkle）＋中性尘（tinydust）＋暗红的一点强调（critical_hit）。
 * 拍子：起（windup 举刃）→ 劈（blade 斜压刀面逐刻推进、strike 命中、wall 抬不起刀或撞墙收招）→ 强调（crit 要害，仅真实暴击）。
 * 范围：blade 用 `data.path`（与服务端每刻 slashQuad 同一组四个顶点）铺成当前这一小段斜刀面；
 *   服务端以当前身体、按刀面全宽重新裁到第一堵墙后，画面读到同一组被截短的顶点，不画穿墙的刃；
 *   整片刀面被截到近零时走 wall，不再补全长。普通命中只有刀面这一条，没有水平矩形铺面。
 * 运动：刀面沿斜线由高处压向落点，命中碎屑在真实接触点向外爆。
 * 数：`data.motes`（物攻换算的崩屑量 ×4，驱动刀面发放量）、`data.notes`（命中碎屑）绑定粒子量；
 *   `data.scale`／`data.intensity` 让重刃比疾刃更大更亮；要害标记的尺寸读 `data.scale`（实际伤害换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SlashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 1.05, 0.15], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 15, shape: { kind: "line", length: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xE8EEF6, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 28
                }
            ]
        },
        blade: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "blade_face", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 60 }, direction: "shape", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.32, 0.06],
                    color: 0xEEF2F8, alpha: [0.35, 0], light: "full", bloom: 0.35, maxParticles: 130
                },
                {
                    name: "blade_edge", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "motes", fallback: 50 }, direction: "shape", speed: [0.05, 0.18], spread: 8,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 100
                }
            ]
        },
        strike: {
            duration: 18,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "hit_burst", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.22], spread: 22,
                    lifetime: [6, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF4F8FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "hit_dust", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x9AA0A8, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        crit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "weak_flash", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: { data: "marks", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 20
                },
                {
                    name: "weak_spark", bind: "point", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], spread: 30,
                    lifetime: [8, 16], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFF6E8, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 34
                }
            ]
        },
        wall: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "wall_chip", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.16], spread: 18,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xD8DCE4, alpha: [0.9, 0], light: "world", bloom: 0.25, maxParticles: 28
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, -0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x9AA0A8, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xA6A8AC, alpha: [0.32, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_slash", 1, SlashDefinition);
