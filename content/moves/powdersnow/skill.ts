/**
 * 细雪 / powdersnow 的出手方式。
 *
 * 核心念头：低头吸一口冷气，朝身前吹出一片又宽又短的扇形雪霰——它不追远，只求便宜、快、能一直吹；
 *   扇面里的每个敌人各挨一次轻冻伤、被吹退半步，并各自掷一次冰冻。这是一招用来反复掷冰冻的工具。
 *
 * 两幕（一击完成）：
 *   起（windup，提交前）：嘴边凝起一层薄霜的预告。
 *   吹（puff → impact）：提交后瞬发——扇面内按距离取最近的 maxTargets 个敌人，各结算一次 puff 伤害、
 *       沿背离施法者的方向推退 push、按 freezeChance 掷冰冻。不留下任何东西。
 *
 * 反制：扇面短而宽，退开一步就出范围；冰冻是概率，单次很轻，威胁在次数。
 * 配置 flurry（乱雪式）：扇面更宽更远、能打更多人、冰冻概率更高，但每人吃得轻、冷却略长。
 */
namespace PokemonSkills {
    const powdersnowScene = "world_combat:move_powdersnow";
    const powdersnowHitText = "world_combat.move.powdersnow.text.hit";
    const powdersnowMissText = "world_combat.move.powdersnow.text.miss";

    function powdersnowCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 扇面的顶点：起点 + 沿扇面边缘取样的一串点；判定用同一个 sector，表现画同一片扇面。 */
    function powdersnowFan(origin: CombatPoint, heading: CombatPoint, range: number, halfAngle: number, segments: number): CombatPoint[] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const out: CombatPoint[] = [origin];
        const rad = halfAngle * Math.PI / 180;
        for (let i = 0; i <= segments; i++) {
            const a = -rad + 2 * rad * i / segments;
            const dir = heading.scale(Math.cos(a)).plus(side.scale(Math.sin(a)));
            out.push(origin.plus(dir.scale(range)));
        }
        return out;
    }

    define({
        id: "powdersnow",
        name: "Powder Snow",
        description: "朝身前吹出一片又宽又短的扇形雪霰：扇面里的每个敌人各挨一次轻冻伤、被吹退半步，并各自有概率被冻住。出手快、冷却短，可以反复吹。乱雪式更宽更远点更多人。",
        uses: ["近身一口罩住挤在身前的几个敌人", "反复吹，一次次掷冰冻", "把贴上来的人吹退半步"],
        kind: "enemy",
        range: 5.5,
        maxRange: 8,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 15,
        style: "powder",
        defaults: { flurry: false, ai: { maxChase: 8, spread: true } },
        fields: [flag("flurry", "乱雪式")],
        indicator: function (config, pokemon) {
            return { radius: p("powdersnow", "range", pokemon), geometry: "area", style: "powder", color: 0xCFEAF8,
                label: config && config.flurry === true ? "细雪·乱雪" : "细雪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["powdersnow"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("powdersnow", "tempo", context)),
                recover: Math.round(p("powdersnow", "aftermath", context)),
                cooldown: Math.round(p("powdersnow", "wait", context)),
                active: 1,
                range: p("powdersnow", "range", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("powdersnow:windup", powdersnowScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.3 ? aim(action) : flat.unit();
            const reach = Math.max(2.5, p("powdersnow", "range", action));
            const halfAngle = Math.max(10, p("powdersnow", "angle", action));
            const power = p("powdersnow", "puff", action);
            const maxTargets = Math.max(1, Math.round(p("powdersnow", "maxTargets", action)));
            const push = p("powdersnow", "push", action);
            const freezeChance = Math.max(0, Math.min(1, p("powdersnow", "freezeChance", action)));
            const fan = powdersnowFan(origin, heading, reach, halfAngle, 6);
            const path = fan.map(powdersnowCoords);
            const scale = reach / 5.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 40));
            const rate = Math.round(50 + power * 2.5);
            const impactCount = Math.round(10 + power * 0.6);
            let hits = 0;

            sound(action, "cobblemon:move.powdersnow.actor");
            WorldFeedback.emit(world, powdersnowScene, 1, origin,
                { moment: "puff", target: String(actor.ref()), direction: [heading.x(), heading.y(), heading.z()],
                    path: path, reach: reach, angle: halfAngle, scale: scale, intensity: intensity, rate: rate, hits: 0 }, 20);

            const region = WorldGeometry.sector(origin, heading, reach, halfAngle * 2, { below: 2, above: 3 });
            const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                candidates.push({ actor: enemy, at: facts.position() });
            });
            candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
            for (let i = 0; i < candidates.length && hits < maxTargets; i++) {
                const victim = candidates[i].actor;
                if (!hurt(action, victim, "powdersnow", power,
                    { damage: damageSpec("powdersnow", "puff"), status: "frozen", chance: freezeChance })) continue;
                hits++;
                const away = candidates[i].at.minus(origin);
                const headingAway = away.length() < 0.05 ? heading : away.unit();
                world.displace(victim, headingAway.scale(push));
                WorldFeedback.emit(world, powdersnowScene, 1, candidates[i].at,
                    { moment: "impact", target: String(victim.ref()), intensity: intensity, scale: scale, impactCount: impactCount }, 20);
            }
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? powdersnowHitText : powdersnowMissText, hits > 0 ? [hits] : [], 22);
            sound(action, "cobblemon:move.powdersnow.target");
            done(action);
        }
    });
}
