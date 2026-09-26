/**
 * 模仿 / mimic 的客户端表现。
 *
 * 一句话：一条思感念线从施法者牵出去搭住实际示范者，把那一手卷回来、在施法者身上织成一层会流动的镜像；
 * 念线读空或被打断时，线在中途断成一撮散点。
 * 色相家族：青白思感色为底（thought_trail / glowingsparkle_cyan），借来的招式用一点镜面虹彩暗示“这是别人的手”。
 * 拍子：起（read 0–16t 念线伸出）→ 织（copy 0–40t，击 0–14t，收 14–40t）→ 借（borrow 长驻，随槽位临时层释放）
 *   ／断（snap 0–22t）／空（fizzle 0–24t）。borrow 在 data.fuse 刻自行碎解，提前驱散则随效果一起收回。
 * 范围：read 的念线是 path，画在两个活体之间——线搭到谁就画到谁，中断也画在中途。
 * 运动：念线从施法者流向示范者又卷回；copy 时镜面从身体里向外翻，borrow 让镜面持续流动。
 * 数：服务端把 `strands`（随特攻派生）交给发射器决定念线条数与镜面层数；借来的招维持越久，copy 的 scale 越大。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const MimicDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 18,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "mind_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    rate: { data: "strands", fallback: 8 }, trail: { minDistance: 0.22 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.06, 0.12],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xBFEFFF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "mind_orbit", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "strands", fallback: 8 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xE8FAFF, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        borrow: {
            duration: 0,
            exit: { stop: 0, drain: 18 },
            emitters: [
                {
                    name: "mirror_flow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    rate: { data: "strands", fallback: 8 },
                    shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.14, 0.03],
                    color: 0x9BE8FF, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    // 借来的招式到期的一刻，镜面沿 data.fuse 自行碎解；提前被驱散则随效果一起收回。
                    name: "mirror_expire", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    start: { data: "fuse", fallback: 600 },
                    burst: { count: { data: "strands", fallback: 8 }, at: { data: "fuse", fallback: 600 }, interval: 1, repeats: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.14, 0.3], spread: 14,
                    lifetime: [12, 22], size: [0.14, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 160
                }
            ]
        },
        copy: {
            duration: 44,
            exit: { stop: 24, drain: 30 },
            emitters: [
                {
                    name: "mirror_shell", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/accentorb",
                    burst: { count: { data: "strands", fallback: 8 } },
                    shape: { kind: "sphere_surface", radius: 0.72 },
                    direction: "inward", speed: [0.05, 0.14],
                    lifetime: [16, 24], size: [0.22, 0.05],
                    color: 0x9BE8FF, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "copy_ring", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: { data: "strands", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.85 },
                    direction: "inward", speed: [0.08, 0.18], spread: 4,
                    lifetime: [14, 22], size: 0.42,
                    color: 0xD8F6FF, alpha: [0.55, 0], light: "full", maxParticles: 90
                },
                {
                    name: "copy_rainbow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "strands", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.12, 0.26], spread: 10,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 160
                }
            ]
        },
        snap: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "severed", bind: "point", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    burst: { count: { data: "strands", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [10, 16], size: [0.12, 0.01],
                    color: 0x9FC8D8, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "empty_puff", bind: "point", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "strands", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mimic", 1, MimicDefinition);
