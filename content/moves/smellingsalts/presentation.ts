/**
 * 清醒 / smellingsalts 的客户端表现。
 *
 * 一句话：施法者指间捏起一撮白色盐晶，贴近伸手一掌；拍中麻痹的敌人时，白盐炸开的同时一串黄色火花
 *   从它身上被震散飞出（麻痹离体），粗盐式还留一层贴地的白粉踉跄；拍中麻痹的友方只见白盐粉与消退的
 *   电麻纹，没有掌击爆点；对方没有麻痹时不显示拍醒成功，只留一层盐粉。
 * 色相家族：盐白（powder、white、smallsparkle）为主，麻痹黄（paralysis_spark）只在「真的拍了拍醒」时进入。
 * 拍子：起 pouch 0–24t ／ 拍 slap 0–20t ／ 击 wake（敌方麻痹）0–28t ／ 击 plain（敌方未麻痹）0–26t
 *   ／ 友 ally 0–26t（cured／numb 由 `data` 决定有无电麻纹）／ 空 miss。
 * 范围：wake／plain／ally 的盐爆与地环绑命中点，尺寸由 `data.scale`（判定半径派生）决定；slap 的盐线沿 `data.direction` 前射。
 * 运动：pouch 的盐向内聚；slap 前喷；命中由内向外炸开；wake 与 ally 的黄色火花向外呈放射状飞出（spark 为 0 时不发）。
 * 数：`data.puff`（速度与等级派生的盐屑数）驱动各段发射量；`data.spark`（麻痹离体时的火花数，未治愈为 0）单独驱动醒神层；
 *   `data.intensity`（最终威力／是否治愈派生）抬高命中爆发的亮度与尺寸。
 */
const SmellingsaltsDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        pouch: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.55, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "puff", fallback: 14 }, shape: { kind: "hemisphere", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.16], spread: 22,
                    lifetime: [7, 14], size: [0.14, 0.02], sizeMode: "sin",
                    color: 0xF2E6B0, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/white",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFFFFF, alpha: [0.75, 0], light: "full", maxParticles: 36
                }
            ]
        },
        slap: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "source", offset: [0, 0.5, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: { data: "puff", fallback: 12 }, shape: { kind: "line", length: 0.42 }, orient: "direction",
                    direction: "shape", speed: [0.08, 0.24], spread: 14,
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xF2E6B0, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        plain: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "puff", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [7, 13], size: [0.30, 0.04], sizeMode: "index",
                    color: 0xF2E6B0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.35, 0.14],
                    color: 0xE8D98A, alpha: [0.6, 0], light: "world"
                }
            ]
        },
        wake: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "puff", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.12, 0.36],
                    lifetime: [8, 14], size: [0.40, 0.05], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 110
                },
                {
                    name: "salt", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "puff", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.14, 0.42], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [9, 17], size: [0.12, 0.02],
                    color: 0xF2E6B0, alpha: [0.95, 0], light: "full", maxParticles: 130
                },
                {
                    name: "spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "spark", fallback: 4 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.2, 0.55], spread: 30,
                    gravity: 0.02, drag: 0.88, spin: 30,
                    lifetime: [8, 15], size: [0.16, 0.02], sizeMode: "index",
                    color: 0xE8C81E, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 60
                },
                {
                    name: "clear", bind: "target", offset: [0, -0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [12, 18], size: [0.5, 0.18],
                    color: 0xE8D98A, alpha: [0.7, 0], light: "world"
                }
            ]
        },
        ally: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "salt", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "puff", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.26], spread: 22,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 14], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xF2E6B0, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "mend", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "spark", fallback: 0 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 34,
                    gravity: 0.01, drag: 0.86, spin: 20,
                    lifetime: [10, 18], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xC9B84A, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "source", offset: [0, 0.4, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "puff", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.03,
                    lifetime: [6, 13], size: [0.06, 0.01],
                    color: 0xE8DDB0, alpha: [0.5, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_smellingsalts", 1, SmellingsaltsDefinition);
