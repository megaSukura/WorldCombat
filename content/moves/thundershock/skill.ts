/**
 * 电击 / thundershock —— 出手方式。
 *
 * 核心念头：一道贴身短促的电刺。施法者一放电，电弧沿一条通视的近直线瞬间扎到目标身上；不起手、冷却最短、
 *   威力最小、射程最短。它的身份在「刺激」：对已经麻痹的目标更狠，并把麻痹续长一截——同族先麻住，电击跟着扎。
 *
 * 幕：
 *   起（windup，提交前）：可选的极短攒电预告（准备为 0 时不播，直接出手）。
 *   击（snap → jab / blocked / whiff）：提交后瞬发。`action.trace(..., true)` 沿直线做权威判定；线端取真实碰撞点，
 *       第一个实体（含同伴）决定结果：敌人被扎中，按实际命中者结算 `jab`（对已麻目标更狠并把麻痹补到 `linger`，
 *       未麻则按 `numbChance` 掷一次），同伴把电流引走，只有墙时打在墙面散掉、什么也不发生。
 *
 * 反制：拉开到射程之外（本族最短），或切断视线；电属性对麻痹免疫（共享默认规则）。
 */
namespace PokemonSkills {
    const thundershockScene = "world_combat:move_thundershock";
    const thundershockHitText = "world_combat.move.thundershock.text.hit";
    const thundershockNumbText = "world_combat.move.thundershock.text.numb";
    const thundershockStimText = "world_combat.move.thundershock.text.stim";
    const thundershockBlockedText = "world_combat.move.thundershock.text.blocked";
    const thundershockWhiffText = "world_combat.move.thundershock.text.whiff";

    /** 沿短直线的折线顶点：两端落在双方身上，中间几下朝侧向抖开，画出的就是判定用的那条近直线。 */
    function thundershockArc(origin: CombatPoint, aim: CombatPoint, segments: number, bend: number): number[][] {
        const path: number[][] = [[origin.x(), origin.y(), origin.z()]];
        const delta = aim.minus(origin);
        const horizontal = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
        const nx = horizontal < 0.001 ? 1 : -delta.z() / horizontal;
        const nz = horizontal < 0.001 ? 0 : delta.x() / horizontal;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const at = origin.plus(delta.scale(t));
            const taper = 1 - Math.abs(2 * t - 1);
            const side = Math.sin(i * 2.399) * bend * taper;
            const lift = Math.sin(i * 1.7) * bend * 0.5 * taper;
            path.push([at.x() + nx * side, at.y() + lift, at.z() + nz * side]);
        }
        path.push([aim.x(), aim.y(), aim.z()]);
        return path;
    }

    define({
        id: thundershockId,
        cooldownParameter: "recharge",
        name: "Thunder Shock",
        description: "一道贴身短促的电刺，瞬间扎上去。射程很近、几乎不占节拍；对已经麻痹的目标更狠，并把麻痹续长一截。电属性对麻痹免疫。",
        uses: ["近身压制的一记快刺", "对已被麻住的目标追打", "在近身缠斗里随时补一下"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 3,
        active: 1,
        recover: 4,
        cooldown: 13,
        style: "jolt",
        defaults: { ai: { maxChase: 8, followUp: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thundershockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(thundershockId, "tempo", context)),
                recover: Math.round(p(thundershockId, "recover", context)),
                cooldown: Math.round(p(thundershockId, "recharge", context)),
                active: 1,
                range: p(thundershockId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            if (prepare > 0) {
                const arcs = Math.max(3, Math.round(p(thundershockId, "arcs", action)));
                action.present("thundershock:charge:" + action.id(), thundershockScene, 1, action.origin(),
                    JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs }));
            }
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[thundershockId], detail: { values: config } };
            return { radius: p(thundershockId, "reach", context), geometry: "line", style: "jolt", color: 0xFFF04A, label: "电击" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const aimPoint = action.targetPosition();
            const radius = p(thundershockId, "radius", action);
            const chance = p(thundershockId, "numbChance", action);
            const numbTicks = Math.max(20, Math.round(p(thundershockId, "numbTicks", action)));
            const linger = Math.max(20, Math.round(p(thundershockId, "linger", action)));
            const arcs = Math.max(3, Math.round(p(thundershockId, "arcs", action)));
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.3));
            const bend = Math.max(0.05, Math.min(0.28, radius * 0.7));

            // 权威判定先行：线的第一个实体（含同伴阻挡）决定结果，末端取真实碰撞点。
            const hit = action.trace(origin, aimPoint, radius, true);
            const endpoint = hit.position();
            const lander = hit.hitEntity() ? hit.target() : null;
            const victim = lander !== null && !world.friendly(lander) && String(lander.key()) !== String(self.key()) ? lander : null;
            const already = victim !== null && world.valid(victim) && CombatStatus.has(world, victim, "paralysis");
            // 伤害目标上下文与 already 一样读实际被扎中者：已麻加成、首次麻痹都按它结算。
            const scope = victim !== null ? withTarget(factContext(action), victim) : factContext(action);
            const power = p(thundershockId, "jab", scope);
            const intensity = Math.max(0.6, Math.min(1.8, power / 34));

            sound(action, "cobblemon:move.thundershock.actor");
            WorldFeedback.emit(world, thundershockScene, 1, origin,
                { moment: "snap", path: thundershockArc(origin, endpoint, 5, bend), arcs: arcs, intensity: intensity, scale: scale }, 20);

            if (victim !== null) {
                const at = world.observe(victim);
                const point = at === null ? endpoint : at.position();
                const dealt = hurt(action, victim, thundershockId, power, { damage: damageSpec(thundershockId, "jab") });
                let marked = false, topped = false;
                if (dealt) {
                    if (already) topped = CombatStatus.inflict(world, victim, "paralysis", linger);
                    else if (world.random() < chance) marked = CombatStatus.inflict(world, victim, "paralysis", numbTicks);
                }
                WorldFeedback.emit(world, thundershockScene, 1, point,
                    { moment: "jab", target: String(victim.ref()), sparks: Math.round((10 + power * 0.7) * (already ? 1.6 : 1)),
                        arcs: arcs, scale: scale, intensity: already ? Math.min(2.2, intensity * 1.4) : intensity }, 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)),
                    already ? thundershockStimText : marked ? thundershockNumbText : thundershockHitText, [], 24);
                if (marked || topped) world.sound("cobblemon:status.nonvolatile.paralysis.actor", point, 14, "{}");
            } else if (lander !== null) {
                const at = world.observe(lander);
                const point = at === null ? endpoint : at.position();
                WorldFeedback.emit(world, thundershockScene, 1, point, { moment: "blocked", scale: scale }, 18);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)), thundershockBlockedText, [], 20);
                world.sound("minecraft:block.amethyst_block.resonate", point, 12, "{}");
            } else {
                WorldFeedback.emit(world, thundershockScene, 1, endpoint, { moment: "whiff", arcs: arcs, scale: scale }, 18);
                WorldFeedback.text(world, endpoint.plus(WorldCombat.point(0, 0.6, 0)), thundershockWhiffText, [], 20);
            }
            done(action);
        }
    });
}
