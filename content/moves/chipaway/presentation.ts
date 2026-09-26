/**
 * 逐步击破 / chipaway 的客户端表现。
 *
 * 一句话：压低身位、拳前亮起微光，随后沿身前那条真实拳路接连打出几记小拳，每一拍停在不同的高度——
 *   真正碰到实体就在接触处崩开碎屑与钝击，若目标防御等级正高，接触处再裂开一道被洞穿的架势环；
 *   撞到方块就在墙面磕出尘屑，前方空无一物只留乱尘。
 * 色相家族：暖白（0xF2EFE6）作主体、灰米（0xD8D2C4）作细节、亮白（0xFFFFFF）作拳尖强调；无第二个色相。
 * 拍子：起 read（压步聚光）→ 击 beat（每拍一条实际拳路）→ 中 hit（实体接触碎屑）／阻 resist（被挡下）／
 *   撞 block（墙面尘屑）／空 miss（乱尘）。
 * 范围：beat 的拳路用 `data.path`（与判定同一条 from→首个接触点的线段）画出，线只伸到这一拍真正停下的地方。
 * 运动：拳锋沿 `data.direction` 朝前点出，墙面的尘屑沿 `data.direction`（接触面法线）弹开。
 * 数：碎屑量绑 `data.chips`（物攻换算），命中强度绑 `data.intensity`（每拍威力 / 20），
 *   架势被洞穿的刻纹数绑 `data.guard`（目标正面防御等级总和，装备护甲本身不在此列）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ChipawayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "stance", bind: "source", offset: [0, 0.5, 0.28], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xF2EFE6, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        beat: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: 4 },
                    direction: "shape", orient: "direction", speed: [0.06, 0.18],
                    lifetime: [4, 8], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF2EFE6, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "knuckle", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [4, 8], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 14
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 7, at: 0 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.06, 0.18], spread: 20,
                    lifetime: [4, 8], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35
                },
                {
                    name: "chips", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.16], spread: 24,
                    lifetime: [6, 12], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xD8D2C4, alpha: [0.75, 0], gravity: 0.04, light: "world", maxParticles: 36
                },
                {
                    name: "pierce", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "guard", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [5, 9], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xE8E4D8, alpha: [0.8, 0], light: "world", maxParticles: 24
                }
            ]
        },
        resist: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "glance", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.12], spread: 30,
                    lifetime: [5, 9], size: [0.08, 0.02],
                    color: 0xD8D2C4, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        block: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "dust", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.28, angleDegrees: 26 },
                    direction: "outward", orient: "direction", speed: [0.05, 0.16], spread: 22,
                    lifetime: [6, 11], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xD8D2C4, alpha: [0.55, 0], gravity: 0.03, light: "world", maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "air", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 20 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xD8D2C4, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chipaway", 1, ChipawayDefinition);
