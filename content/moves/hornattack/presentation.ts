/**
 * 角撞 / hornattack 的客户端表现。
 *
 * 一句话：低头刨地、头前短角光沿正面聚起，随后一条土黄短带沿正面顶出，命中处炸开一般系冲击；
 * 角不松，先看目标被贴地推走、本体再跟进，两具身体脚下各拖出一路低伏的地面尘土，推不动就收角。
 * 色相家族：土黄（0xC9A06A）作主体、暖棕（0x9A7A4E）作细节、近白（0xF6ECD0）作强调；中性尘屑收尾。
 * 拍子：起 brace（低头刨地、角光向前）→ 顶 gore（短带顶出 + 短角形）与 impact（扎实）→ 推 pushFoe／pushBody（两实体脚下拖尘）／空 miss。
 * 范围：gore 的短带用 `data.path`（与服务端原生扫掠的起止两点一致）画成一条短线，玩家一眼看出身体趟到哪。
 * 朝向：brace 的角光与 gore 的短角形用 `data.direction`（含竖直瞄准的稳定基）指向接触方向，不再是固定世界偏置。
 * 运动：pushFoe 从目标脚边、pushBody 从本体脚下贴地拖尘（`data.moved` 是本刻实际位移），推走方向即角的方向。
 * 数：尘土量绑 `data.dust`（体重换算），命中强度绑 `data.intensity`（本击威力 / 62），短带体积绑 `data.scale`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HornattackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "paw", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0x9A7A4E, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "aim", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 8, shape: { kind: "line", length: 0.4 }, direction: "shape", orient: "direction",
                    speed: [0.02, 0.08], spread: 8,
                    lifetime: [5, 10], size: [0.14, 0.03],
                    color: 0xF6ECD0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        gore: {
            duration: 18,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "horn", bind: "source", offset: [0, 0.4, 0.15], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "line", length: 0.45 }, direction: "shape", orient: "direction",
                    rate: { data: "dust", fallback: 14 }, speed: [0.04, 0.16], spread: 10,
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF6ECD0, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "lane", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    shape: { kind: "polyline" }, rate: { data: "dust", fallback: 14 },
                    direction: "shape", orient: "direction", speed: [0.03, 0.12], spread: 12,
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xF6ECD0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "track", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.06, drag: 0.94,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC9A06A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        impact: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 12, at: 0 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.07, 0.22], spread: 24,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "clods", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 14 } },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.08, drag: 0.94,
                    lifetime: [9, 17], size: [0.1, 0.03], sizeMode: "index",
                    color: 0x9A7A4E, alpha: [0.6, 0], light: "world", maxParticles: 46
                }
            ]
        },
        push: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "drag", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "dust", fallback: 12 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.06, drag: 0.92,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC9A06A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "trail", bind: "point", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 10, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], spread: 16,
                    lifetime: [5, 9], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF6ECD0, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "air", bind: "point", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 10 } },
                    shape: { kind: "cone", radius: 0.34, angleDegrees: 18 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.05, drag: 0.94,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0x9A7A4E, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hornattack", 1, HornattackDefinition);
