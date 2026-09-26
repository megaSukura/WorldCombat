/**
 * 掷锚 / anchorshot 的客户端表现。
 *
 * 一句话：施法者把锚抡圆朝选定方向或实体甩出，铁锚沿一条小弧砸中对手，一声闷响后锚头沉到它脚边真实钉住的地面，
 *   一条链从那个锚点绷直拴住目标；目标每想走一步，链就亮起一节把它拽回；锚被破坏、链绷断或收回时，链节同刻散开。
 * 色相家族：钢灰与银白（锚与火花），链节用原色（铁灰）；强调点用近白，不加第二个色相。
 * 拍子：起 windup（抡链 0–14t）→ 掷 flight（锚头弧飞，随弹体存续）→ 撞 clank（钢花在真实锚点炸开 0–24t）
 *   → 拴 chain（锚点到目标的链沿路径持续）→ 断 snap／收 release。
 * 范围：`data.scale`（锚头判定 / 0.28）缩放锚头与链节尺寸；链路本身用 `data.path` 的锚点与目标两个真实顶点画出。
 * 运动：锚头绑弹体走小弧；拴住后链的两个顶点一个固定在地面锚点、一个随目标每帧移动，链始终连在两者之间；
 *   链路由链自己的托管效果持有，锚失效或被驱散时同刻收回。
 * 数：`data.links`（体重换算的链节数）绑定飞行尾迹与链路密度，`data.intensity`（威力 / 80）放大撞击那一幕。
 */
const AnchorshotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "swing", bind: "source", offset: [0, 0.85, 0.25], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 18, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.12], spin: 18,
                    lifetime: [6, 11], size: [0.3, 0.12], sizeMode: "linear",
                    alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "heft", bind: "source", offset: [0, 0.6, 0.3], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xDCE3E8, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        flight: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "anchor", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    trail: { minDistance: 0.4 }, rate: { data: "links", fallback: 6 },
                    direction: "outward", speed: [0.0, 0.03], spin: 20, spriteFrom: "age",
                    lifetime: [5, 10], size: [0.3, 0.14], sizeMode: "linear",
                    alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "streak", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    trail: { minDistance: 0.6 }, rate: 6,
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.16, 0.05],
                    color: 0xDCE3E8, alpha: [0.5, 0], light: "world", maxParticles: 18
                }
            ]
        },
        clank: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "point" },
                    lifetime: [8, 13], size: [0.8, 0.3], sizeMode: "linear",
                    color: 0xDCE3E8, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 4
                },
                {
                    name: "sparks", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "links", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.36], spread: 34, gravity: 0.03, drag: 0.9,
                    lifetime: [6, 13], size: [0.1, 0.03], sizeMode: "linear",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [9, 14], size: [0.5, 0.16], sizeMode: "linear",
                    color: 0xDCE3E8, alpha: [0.5, 0], light: "world", maxParticles: 4
                }
            ]
        },
        chain: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "links", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    shape: { kind: "polyline" }, rate: { data: "links", fallback: 6 },
                    direction: "shape", speed: [0.0, 0.02], spin: 6, spriteFrom: "age",
                    lifetime: [5, 10], size: [0.26, 0.12], sizeMode: "linear",
                    alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "tension", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" }, rate: 8,
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [4, 9], size: [0.08, 0.03],
                    color: 0xDCE3E8, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shatter", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: { data: "links", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 40, gravity: 0.04, drag: 0.9, spin: 16,
                    lifetime: [8, 16], size: [0.24, 0.1],
                    alpha: [0.7, 0], light: "world", maxParticles: 28
                },
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3], spread: 40,
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 18
                }
            ]
        },
        release: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "retract", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    shape: { kind: "polyline" }, burst: { count: { data: "links", fallback: 5 }, at: 0, repeats: 2, interval: 3 },
                    direction: "toward", speed: [0.04, 0.14], spin: 8,
                    lifetime: [6, 12], size: [0.22, 0.08],
                    alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.14], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xDCE3E8, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "thud", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "circle", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.03, drag: 0.88,
                    lifetime: [10, 18], size: [0.16, 0.05],
                    color: 0x9AA3AD, alpha: [0.5, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_anchorshot", 1, AnchorshotDefinition);
