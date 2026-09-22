/**
 * 角撞 / hornattack 的客户端表现。
 *
 * 一句话：低头刨地、角尖压低聚起一点土色亮光，随后一条土黄窄带沿正面顶出，命中处炸开一般系冲击；
 * 角不松，目标被贴着地面推走，脚下拖出一条滚滚尘土。
 * 色相家族：土黄（0xC9A06A）作主体、暖棕（0x9A7A4E）作细节、近白（0xF6ECD0）作强调；中性尘屑收尾。
 * 拍子：起 brace（低头刨地）→ 顶 gore（窄带顶出）与 impact（扎实）→ 推 push（一路拖尘）／空 miss。
 * 范围：gore 的窄带用 `data.path`（与服务端 lane 同一组顶点）填成一条窄带，玩家一眼看出只有这条线会被顶到。
 * 运动：窄带沿 `data.direction` 一次顶出；push 的尘土从目标脚边向后滚、沿推走方向持续拖出。
 * 数：尘土量绑 `data.dust`（体重换算），命中强度绑 `data.intensity`（本击威力 / 62），窄带体积绑 `data.scale`。
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
                    name: "aim", bind: "source", offset: [0, 0.45, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
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
                    name: "lane", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    shape: { kind: "polygon" }, burst: { count: { data: "dust", fallback: 14 } },
                    direction: "shape", orient: "direction", speed: [0.03, 0.12], spread: 12,
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xF6ECD0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "track", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "line", length: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.06, drag: 0.94,
                    lifetime: [8, 15], size: [0.08, 0.02],
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
            duration: 12,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "drag", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 }, shape: { kind: "line", length: 0.5 },
                    direction: "away", speed: [0.05, 0.16], gravity: 0.06, drag: 0.92,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC9A06A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "trail", bind: "target", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 6, at: 0 }, shape: { kind: "line", length: 0.4 },
                    direction: "away", speed: [0.06, 0.18],
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
                    name: "air", bind: "source", offset: [0, 0.4, 0.5], height: 0.4,
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
