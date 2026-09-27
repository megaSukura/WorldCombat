/**
 * 写生 / sketch 的客户端表现。
 *
 * 一句话：施法者俯身看准目标那一手，观察期里固定浮出「这次要描的招名」并绕脚画出一圈墨色落笔进度；
 *   成功时身上落下一片墨色笔触，把那手描进自己的招式表；没有可描的一手时，墨迹在半空化开。
 * 色相家族：墨黑与深靛（ink / shadow）为底，纸白只出现在落笔的核心与边缘，是画面里唯一的亮点。
 * 拍子：起（draw 观察，自定义场景同时画连线/招名/进度）→ 描（ink 0–44t，击 0–14t，收 14–44t）／空（fizzle 0–24t）。
 * 范围：观察连线由 `world_combat:move_sketch_watch` 每帧按真实锚点重画，不再用会因静止而不发射的 path+trail；
 *   ink 的笔触全绑在施法者身上——描的是自己。
 * 数：服务端把 `strokes`（随特攻派生）交给发射器决定笔触与纸点数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SketchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 20,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "paper_glow", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "strokes", fallback: 8 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xF4F0E0, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        ink: {
            duration: 46,
            exit: { stop: 26, drain: 30 },
            emitters: [
                {
                    name: "brushstroke", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/scratch",
                    burst: { count: { data: "strokes", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.6, randomDirection: 0.4 },
                    direction: "outward", speed: [0.12, 0.3], spread: 12,
                    lifetime: [10, 16], size: [0.4, 0.05], sizeMode: "index",
                    color: 0x23232B, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "ink_pages", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 24], size: [0.12, 0.02],
                    color: 0x4A4A66, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "paper_motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [16, 28], size: [0.08, 0.01],
                    color: 0xF4F0E0, alpha: [0.7, 0], light: "full", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "blot", bind: "point", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "strokes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.16, 0.26],
                    color: 0x3A3A46, alpha: [0.34, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sketch", 1, SketchDefinition);

/**
 * 观察期叠加层：每帧跟住真实锚点画施法者到示范者的连线（静止也持续可见），绕脚下画出随准备推进的落笔进度，
 * 并在施法者头上固定浮出这次锁定的招名与一枚按所学招属性着色的招图——落笔前就知道要描哪一手。
 * 落笔完成或被中断后本层随动作清理。
 */
const SketchTypeColors: { [type: string]: number } = {
    normal: 0xA8A878, fire: 0xF08030, water: 0x6890F0, electric: 0xF8D030, grass: 0x78C850,
    ice: 0x98D8D8, fighting: 0xC03028, poison: 0xA040A0, ground: 0xE0C068, flying: 0xA890F0,
    psychic: 0xF85888, bug: 0xA8B820, rock: 0xB8A038, ghost: 0x705898, dragon: 0x7038F8,
    dark: 0x705848, steel: 0xB8B8D0, fairy: 0xEE99AC
};

WorldCombatClient.scene("world_combat:move_sketch_watch", 1, function (frame) {
    const entry: CombatSceneEntry<{ move?: string; type?: string; target?: string; start?: number; ticks?: number; progress?: number }> = JSON.parse(frame.data());
    if (entry.lifecycle) return;
    const data = entry.data || {};
    const self = JSON.parse(frame.anchor(entry.source));
    if (!self) return;
    const sy = self.y + Math.max(0.6, (self.height || 1) * 0.6);
    const target = data.target ? JSON.parse(frame.anchor(data.target)) : null;
    if (target) frame.line(self.x, sy, self.z, target.x, target.y + Math.max(0.5, (target.height || 1) * 0.5), target.z, 0x882B2B33);
    const total = typeof data.ticks === "number" ? data.ticks : 0;
    let progress = typeof data.progress === "number" ? data.progress : 0;
    if (total > 0 && typeof data.start === "number") progress = Math.max(0, Math.min(1, (frame.serverTick() - data.start) / total));
    if (progress > 0 && progress < 1) {
        const radius = Math.max(0.4, (self.width || 0.9) * 0.7), steps = Math.max(6, Math.round(progress * 24));
        let px = self.x + radius, pz = self.z;
        for (let i = 1; i <= steps; i++) {
            const angle = -Math.PI / 2 + (i / 24) * Math.PI * 2;
            const nx = self.x + Math.cos(angle) * radius, nz = self.z + Math.sin(angle) * radius;
            frame.line(px, self.y + 0.08, pz, nx, self.y + 0.08, nz, 0xCC2B2B33);
            px = nx; pz = nz;
        }
    }
    if (!data.move) return;
    const top = Math.max(0.6, self.height || 1);
    const colour = SketchTypeColors[String(data.type || "").toLowerCase()] || 0xF4F0E0;
    frame.sprite("cobblemon:particle/generic/orb/energyorb", self.x, self.y + top + 0.55, self.z, 0.22, 0, (0xE0 << 24) | colour, 0, true);
    frame.billboard(entry.source, top + 0.35, 0.011, function (surface) {
        surface.text(surface.translate("cobblemon.move." + data.move), 0, 0, 0xFFF4F0E0, 140);
    });
});
