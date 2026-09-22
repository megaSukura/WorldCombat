/**
 * 大愤慨 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者喉头先聚起一团橙红的火，随后朝前猛地喷出一条贴地的火线；被烧到的人身上炸开火星，
 *   火线的尽头落下一片翻卷的余烬，一直冒着烟；冲完头顶转起眩晕的气流。
 * 色相家族：橙红 0xE2531B 与亮黄 0xFFCF6A 为主，低饱和烟灰 0x6B5146 只做余烬与余韵；火与烟是一家色相。
 * 层次：聚火（tempo）→ 火线（charge）→ 命中火星（scorch）→ 落点余烬（ember）→ 余烬持续（smolder）→ 收束眩晕（spent）→ 持续眩晕（dizzy）。
 * 范围：charge 的 `line_fill` 绑 `path`、用 `polygon` 填出服务端与判定共用的那条火线走廊（data.path），
 *   画出的面就是会被烧到的范围；落点余烬用一个铺在地面的圆盘画出 `emberRadius`。
 * 运动：火线沿朝向喷出、火星向前翻卷；余烬贴着地面翻滚上升；冲势条沿 `data.direction` 指向。
 * 数：服务端把 `data.sparks`（火星数）、`data.intensity`（威力）与 `data.scale`（火线/余烬尺寸）交给发射器，数量和强度按机制走。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RagingFuryDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "kindle", bind: "source", offset: [0, 0.9, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0xE2531B, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "heat", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFCF6A, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "line_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "sparks", fallback: 16 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.04, 0.12], drag: 0.94,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xE2531B, alpha: [0.6, 0], light: "full", maxParticles: 110
                },
                {
                    name: "jet", bind: "source", offset: [0, 0.55, 0], height: 0.45, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: 14 }, shape: { kind: "cone_volume", radius: 0.6, length: 2.4, angleDegrees: 22 },
                    direction: "outward", speed: [0.2, 0.5], drag: 0.9,
                    lifetime: [6, 12], size: [0.18, 0.02],
                    color: 0xFFCF6A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "smoke", bind: "source", offset: [0, 0.7, 0], height: 0.5, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.92,
                    lifetime: [14, 24], size: [0.16, 0.02],
                    color: 0x6B5146, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        scorch: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burn_hit", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 16 } }, amount: 1,
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], drag: 0.92,
                    lifetime: [8, 16], size: [0.16, 0.02],
                    color: 0xFFCF6A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "burn_smoke", bind: "target", height: 0.7, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.16, 0.02],
                    color: 0x6B5146, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        ember: {
            duration: 44,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "ember_disc", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "circle", radius: 2.2 },
                    direction: "up", speed: [0.05, 0.18], drag: 0.94,
                    lifetime: [14, 24], size: [0.16, 0.02],
                    color: 0xE2531B, alpha: [0.65, 0], light: "full", maxParticles: 140
                },
                {
                    name: "ember_glow", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: 16, repeats: 3, interval: 8 }, shape: { kind: "circle", radius: 2.2 },
                    direction: "up", speed: [0.06, 0.2], drag: 0.92,
                    lifetime: [12, 22], size: [0.5, 0.06], sizeMode: "sin",
                    color: 0xFFCF6A, alpha: [0.5, 0], light: "full", bloom: 0.25, maxParticles: 60
                }
            ]
        },
        smolder: {
            duration: 0,
            exit: { stop: 0, drain: 24 },
            emitters: [
                {
                    name: "smolder_loop", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "circle", radius: 2.2 },
                    direction: "up", speed: [0.04, 0.14], drag: 0.94,
                    lifetime: [14, 24], size: [0.14, 0.02],
                    color: 0xE2531B, alpha: [0.5, 0], light: "full", maxParticles: 70
                },
                {
                    name: "smolder_smoke", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 10, shape: { kind: "circle", radius: 2.2 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0x6B5146, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dizzy", bind: "source", offset: [0, 1.15, 0], height: 0.2, fit: "body", spin: 12,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 10, repeats: 2, interval: 8 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 26], size: [0.22, 0.06],
                    alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "fume", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.15, 0.02],
                    color: 0x6B5146, alpha: [0.35, 0], light: "world", maxParticles: 26
                }
            ]
        },
        punish: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "backlash", bind: "source", offset: [0, 0.8, 0], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.08, 0.22], drag: 0.92,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0xFFCF6A, alpha: [0.85, 0], light: "full", maxParticles: 26
                }
            ]
        },
        dizzy: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "dizzy_loop", bind: "source", offset: [0, 1.15, 0], height: 0.15, fit: "body", spin: 9,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.18, 0.05],
                    alpha: [0.4, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ragingfury", 1, RagingFuryDefinition);
