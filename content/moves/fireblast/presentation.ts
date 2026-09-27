/**
 * 大字爆炎 / fireblast 的客户端表现。
 *
 * 一句话：喉间先攒起一团将写成字的火，随后「大」字的三笔在字心处一笔一笔点亮（笔画厚度与伤害带一致），
 * 字成形时每一笔沿真实笔迹爆亮，字心只留余烟；刻印式还有贴地的余字，只有发烫的笔画带发光、字间空隙留白。
 * 色相家族：烈火橙（0xFF6A24）与白热黄（0xFFE8A0）为主体，深褐烟（0x3A2E2A）衬托；余字随时间暗下。
 * 拍子：起 stoke（聚火）→ 书 bar/left/right（三笔点亮）→ 崩 flare（逐笔爆亮）与 erupt（字心余烟）与 hit
 *   → 印 mark/markhit（地面余字按笔画闷烧）→ fade。
 * 范围：笔画厚度直接读 `data.thickness`（机制笔画厚度），字间空隙因此保持空；mark 只沿 `data.path` 的笔画带发光，
 *   不画整圆焦圈，避免误读为满圆危险；erupt 也只留余烟，不再以字心圆爆遮掩真实安全空隙。
 * 运动：三笔与地面余字都沿服务端给的 `data.path`（真实笔迹顶点）铺设，崩开沿笔迹爆亮、余字贴地。
 * 数：flare/hit 的火星数绑定 `data.sparks`（特攻与等级换算），强度绑定 `data.intensity`（威力派生）；
 *   余字的颜色绑定 `data.color`（随余下寿命由鲜橙转暗烬）。
 */
const FireblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stoke: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 18, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.22, 0.05],
                    color: 0xFFE8A0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 34
                },
                {
                    name: "sparks", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.05, 0.16], spread: 12,
                    lifetime: [6, 13], size: [0.08, 0.01],
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 36
                }
            ]
        },
        bar: {
            duration: 0,
            emitters: [
                {
                    name: "ink", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 60, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.1], spread: 8,
                    lifetime: [5, 10], size: [{ data: "thickness", fallback: 0.26 }, 0.05],
                    color: 0xFF6A24, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 100
                }
            ]
        },
        left: {
            duration: 0,
            emitters: [
                {
                    name: "ink", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 60, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.1], spread: 8,
                    lifetime: [5, 10], size: [{ data: "thickness", fallback: 0.26 }, 0.05],
                    color: 0xFF6A24, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 100
                }
            ]
        },
        right: {
            duration: 0,
            emitters: [
                {
                    name: "ink", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 60, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.1], spread: 8,
                    lifetime: [5, 10], size: [{ data: "thickness", fallback: 0.26 }, 0.05],
                    color: 0xFF6A24, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.04, 0.16], spread: 20,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [6, 13], size: [0.07, 0.01],
                    color: 0xFFD06A, alpha: [0.85, 0], light: "full", maxParticles: 100
                }
            ]
        },
        flare: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "bright", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.04, 0.2], spread: 14,
                    lifetime: [6, 12], size: [{ data: "thickness", fallback: 0.26 }, 0.04], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 90
                },
                {
                    name: "embers", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 10 } },
                    shape: { kind: "polyline" },
                    direction: "outward", speed: [0.08, 0.28], spread: 24,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [9, 18], size: [0.1, 0.01], sizeMode: "index",
                    color: 0xFF6A24, alpha: [0.95, 0], light: "full", maxParticles: 130
                }
            ]
        },
        erupt: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "smoke", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: { data: "glyph", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 26], size: [0.34, 0.56],
                    color: 0x3A2E2A, alpha: [0.28, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.32], spread: 18,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "scorch", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [10, 20], size: [0.22, 0.04],
                    color: 0xFF6A24, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        },
        mark: {
            duration: 0,
            emitters: [
                {
                    name: "ink", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [8, 16], size: [{ data: "thickness", fallback: 0.3 }, 0.02],
                    color: { data: "color", fallback: 0xFF6A24 }, alpha: [0.55, 0], light: "full", maxParticles: 120
                }
            ]
        },
        markhit: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ember", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 12, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.03, 0.12], spread: 16,
                    lifetime: [8, 15], size: [0.08, 0.01],
                    color: 0xFF6A24, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 9, drain: 20 },
            emitters: [
                {
                    name: "dying", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: { data: "glyph", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [14, 24], size: [0.34, 0.58],
                    color: 0x2E2624, alpha: [0.32, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fireblast", 1, FireblastDefinition);
