/**
 * 鹦鹉学舌 / mirrormove 的客户端表现。
 *
 * 一句话：施法者身前立起一面羽翼般的镜盾，把对手刚挥出的那一手沿来路原样折回；镜面在折返的一瞬亮起，
 *   若那一手折不动，镜盾只裂成一地碎光。
 * 色相家族：飞羽青 0x7FD0E8 与镜银 0xE8F4FF（镜盾本身），一点镜面虹彩只出现在折返的一闪。
 * 拍子：brace 起（0–14t 立盾）→ reflect 击（0–12t 折出）→ burst 落（0–20t）／dull 空（0–20t 裂镜）。
 * 范围：reflect 的折返线沿 path（施法者→目标）连起，线到哪就打到哪；brace/dull 绑施法者。
 * 运动：立盾时镜面从两侧合拢、朝对手张开；折返时镜光沿来路射回。
 * 数：服务端把 mirrors（特攻派生）交给镜面层数，edge（锐镜倍率）交给折返线的强度与镜光的尺寸。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const mirrormoveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        native_contact: { duration: 5, exit: { stop: 2, drain: 3 }, emitters: [{ name: "shadow_palm", bind: "source", height: 0.5, orient: "direction",
            particle: "world_combat_core:cobblemon/generic/hollowfist", burst: { count: 1 }, shape: { kind: "point" },
            direction: [0,0,1], speed: .5, lifetime: 3, size: [.4,.15], color: 0xBFE6F5, alpha: [.85,0], light: "full" }] },
        native_flight: { exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_flight", bind: "projectile",
            particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle", rate: 14, trail: { minDistance: .2 },
            shape: { kind: "point" }, speed: 0, lifetime: 6, size: [.06,.02], color: 0xBFE6F5, alpha: [.6,0], light: "world" }] },
        native_hit: { duration: 10, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_hit", bind: "point",
            particle: "world_combat_core:cobblemon/generic/hit_yellow", burst: { count: 1 }, shape: { kind: "point" },
            speed: 0, lifetime: 5, size: [.3,.05], color: 0xBFE6F5, alpha: [.9,0], light: "full" }] },
        native_miss: { duration: 8, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_miss", bind: "point",
            particle: "world_combat_core:cobblemon/generic/tinydust", burst: { count: 3 }, shape: { kind: "sphere", radius: .12 },
            speed: .02, lifetime: 5, size: [.06,.02], color: 0xBFE6F5, alpha: [.4,0], light: "world" }] },
        brace: {
            duration: 14,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "brace_screen", bind: "source", offset: [0, 0.7, 0], height: 0.5, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: { data: "mirrors", fallback: 6 },
                    shape: { kind: "circle", radius: 0.52, thickness: 0.15 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.32, 0.16],
                    color: 0xBFE6F5, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "brace_glint", bind: "source", offset: [0, 0.7, 0], height: 0.5, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/screen_color",
                    burst: { count: { data: "mirrors", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 0.48, thickness: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.18, 0.05],
                    alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        reflect: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "reflect_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: { data: "mirrors", fallback: 6 }, trail: { minDistance: 0.24 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.2, 0.42],
                    lifetime: [10, 16], size: [0.16, 0.03],
                    color: 0xE8F4FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "reflect_flash", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.3, 0.55], spread: 3,
                    lifetime: [12, 18], size: 0.3,
                    color: 0x9FE8F8, alpha: [0.7, 0], light: "full", maxParticles: 50
                },
                {
                    name: "reflect_rainbow", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "mirrors", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.24], spread: 12,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    alpha: [0.9, 0], light: "full", bloom: { data: "edge", fallback: 0.45 }, maxParticles: 80
                }
            ]
        },
        burst: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst_impact", bind: "point", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 3 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [12, 18], size: [0.42, 0.12],
                    color: 0xE8F4FF, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "burst_shards", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "mirrors", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.15, 0.35], spread: 24,
                    lifetime: [10, 16], size: [0.1, 0.01],
                    color: 0xCFEFF8, alpha: [0.9, 0], light: "full", maxParticles: 70
                }
            ]
        },
        dull: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dull_crack", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "mirrors", fallback: 6 } },
                    shape: { kind: "circle", radius: 0.5, thickness: 0.4 },
                    direction: "down", speed: [0.1, 0.3], spread: 10,
                    gravity: 0.04,
                    lifetime: [16, 24], size: [0.08, 0.02],
                    color: 0x9FB6C2, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mirrormove", 1, mirrormoveDefinition);
