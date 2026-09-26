/**
 * 扎根 / ingrain 的客户端表现。
 *
 * 一句话：施法者脚下一沉，尘土先被压开，一丛根须从脚边钻进地里、盘住脚下的地面；此后每一拍真的抽上生机时，
 * 绿色的生机才从根须间贴着地面升起、汇进身体，脚边泛起一圈浅浅的土环；拔根时根须缩回、碎土落下。
 * 色相家族：草绿 0x6FA83A 为主体，亮绿 0x9CD44A 作涌起的生机，土褐 0x6B4A2B 作地面与根须细节。
 * 拍子：下沉（sink 0–10t）→ 扎定（root 0–30t）→ 抽养（pulse，仅在真的回血时）→ 根须（roots，绑标记效果的持续低密度）→ 拔根（fade 0–24t）。
 * 范围：地面根环绑扎根脚点、fit none，半径按 `data.scale`（实际根域半径 / 1.2）推出；判定与表现同径。
 * 运动：尘土被压开 → 根须向地下钻 → 回血时绿光沿根须向上汇集 → 拔根时根须缩回、土屑落下。
 * 数：根须量绑 `data.roots`（体重/等级派生），每拍回血强弱绑 `data.healed` / `data.intensity`（机制派生的实际回复量）。
 * 持续：roots 由服务端 `WorldFeedback.onEffect` 绑在扎根标记效果上，标记被驱散时表现同步收走，不会残留。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const IngrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sink: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "press", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "circle", radius: 0.9 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x6B4A2B, alpha: [0.5, 0], light: "world", maxParticles: 44
                }
            ]
        },
        root: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "roots_down", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "roots", fallback: 12 } },
                    shape: { kind: "circle", radius: 1.1 },
                    direction: "down", speed: [0.05, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 20], size: [0.2, 0.03], sizeMode: "index",
                    color: 0x6FA83A, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "soil_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 1.2 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.34, 0.6], sizeMode: "index",
                    color: 0x6B4A2B, alpha: [0.5, 0], light: "world", maxParticles: 26
                },
                {
                    name: "seed_dust", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: 16 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "up", speed: [0.04, 0.14], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x8CC63F, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        pulse: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "sap_up", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "roots", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.06, 0.2], gravity: -0.01, drag: 0.94,
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x9CD44A, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "green_spark", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xD6F58A, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        roots: {
            duration: 0,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "root_glow", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 2, shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 30], size: [0.06, 0.02], sizeMode: "sin",
                    color: 0x8CC63F, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "pull_back", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x6B4A2B, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ingrain", 1, IngrainDefinition);
