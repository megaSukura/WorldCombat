/**
 * 抓 / scratch 的出手方式。
 *
 * 核心念头：**一次掠过的爪击撕出一排平行爪痕**——抬手就挠，每道痕扫过身前一段短距，命中它的东西各挨一道浅割。
 * 它是全族最便宜、最快的一记：冷却最短、单道最低，但一爪划出多道痕，对手越宽、站得越近，同时被抓中的痕越多。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体、爪尖亮起并拢住一点寒光，只播预告。
 *   挠（rake）：提交后朝目标垫前一小步，按 `span` 铺开 `lines` 道爪痕——每一道各自沿方向探出 `reach` 格、
 *       以 `line` 为半宽取第一个目标结算一记 `claw` 接触斩击；同一目标落在多道痕上就结算多次。
 *   收：一道都没抓中只留一串划空的风。
 *
 * 与同族分开：铁爪是左右两记带磨利、撕裂爪是交叉撕甲、劈开是慢而准的单点重劈、连斩是越打越多刀的攒节奏；
 * 抓是唯一「一爪多道、痕数随速度、命中数随目标体型」的便宜快招。
 *
 * 配置 `sweep` 由公式改道数、张角、威力与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const scratchScene = "world_combat:move_scratch";
    const scratchHitText = "world_combat.move.scratch.text.hit";
    const scratchMissText = "world_combat.move.scratch.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function scratchHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 把水平方向在水平面内旋转 degrees 度，得到某一道爪痕的朝向。 */
    function scratchRotate(heading: CombatPoint, degrees: number): CombatPoint {
        const angle = Math.atan2(heading.x(), heading.z()) + degrees * Math.PI / 180;
        return WorldCombat.point(Math.sin(angle), 0, Math.cos(angle));
    }

    /** 一道爪痕的两个端点：判定与表现共用同一组顶点。 */
    function scratchLine(origin: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const end = origin.plus(heading.scale(reach));
        return [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
    }

    define({
        id: "scratch",
        cooldownParameter: "recharge",
        name: "Scratch",
        description: "Hard, pointed, sharp claws rake the target to inflict damage.",
        uses: ["贴脸一爪划出一排爪痕", "对大体型或并排的对手一次抓多道", "用最短冷却的便宜招持续磨血"],
        kind: "enemy",
        range: 2.1,
        maxRange: 2.9,
        prepare: 6,
        active: 12,
        recover: 5,
        cooldown: 20,
        style: "claw",
        defaults: { sweep: false, ai: { maxChase: 4, huntBig: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("scratch", "reach", pokemon), geometry: "cone", style: "claw", color: 0xF2EFE6,
                label: config && config.sweep === true ? "宽搔式" : "直搔式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["scratch"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("scratch", "tempo", context)),
                recover: Math.round(p("scratch", "aftercast", context)),
                cooldown: Math.round(p("scratch", "recharge", context)),
                active: skills["scratch"].active,
                range: p("scratch", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_scratch:windup", scratchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", lines: Math.round(p("scratch", "lines", action)),
                    sweep: config && config.sweep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = scratchHeading(aim(action));
            const reach = Math.max(1.4, p("scratch", "reach", action));
            const lines = Math.max(2, Math.min(7, Math.round(p("scratch", "lines", action))));
            const span = Math.max(24, Math.min(96, p("scratch", "span", action)));
            const half = Math.max(0.12, p("scratch", "line", action));
            const power = p("scratch", "claw", action);
            const step = Math.max(0, p("scratch", "step", action));
            const notes = Math.max(8, Math.round(p("scratch", "notes", action)));
            const scale = Math.max(0.6, Math.min(1.8, reach / 2.1));
            const intensity = Math.max(0.6, Math.min(2.2, power / 11));
            const edge = Math.max(2, Math.round(notes / Math.max(2, lines)));
            const sparks = Math.max(6, Math.round(notes * 0.7));

            const self = world.observe(actor);
            if (self !== null && step > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                const delta = body !== null ? body.position().minus(self.position()) : heading.scale(step);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(step, Math.max(0, flat - reach * 0.55));
                if (advance > 0.02) world.displace(actor, heading.scale(advance));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            let hits = 0;
            const gapAngle = lines <= 1 ? 0 : span / (lines - 1);
            for (let index = 0; index < lines; index++) {
                const direction = scratchRotate(heading, (index - (lines - 1) / 2) * gapAngle);
                const path = scratchLine(origin, direction, reach);
                WorldFeedback.emit(world, scratchScene, 1, origin,
                    { moment: "rake", path: path, line: index, lines: lines, span: span, reach: reach,
                        edge: edge, notes: notes, scale: scale, intensity: intensity,
                        direction: [direction.x(), direction.y(), direction.z()] }, 14);
                const impact = action.trace(origin, origin.plus(direction.scale(reach)), half);
                const target = impact.hitEntity() ? impact.target() : null;
                if (target !== null && hurt(action, target, "scratch", power,
                    { damage: damageSpec("scratch", "claw"), contact: true, slice: true })) {
                    hits++;
                    WorldFeedback.emit(world, scratchScene, 1, impact.position(),
                        { moment: "hit", target: String(target.ref()), line: index, sparks: sparks,
                            scale: scale, intensity: intensity }, 16);
                } else if (impact.blocked()) {
                    WorldFeedback.emit(world, scratchScene, 1, impact.position(),
                        { moment: "scrape", line: index, edge: edge, scale: scale, intensity: intensity }, 14);
                }
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            const above = origin.plus(WorldCombat.point(0, 1.1, 0));
            if (hits === 0) {
                WorldFeedback.emit(world, scratchScene, 1, origin, { moment: "whiff", lines: lines, scale: scale, intensity: intensity }, 18);
                WorldFeedback.text(world, above, scratchMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.weak");
            } else {
                WorldFeedback.text(world, above, scratchHitText, [hits], 22);
                sound(action, "minecraft:entity.player.attack.weak");
            }
            done(action);
        }
    });
}
