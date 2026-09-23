/**
 * 鼠数儿 / populationbomb 的出手方式。
 *
 * 核心念头：伙伴们纷纷赶来集合，然后一只接一只从目标四周扑上去——**这一串能拉多长是不确定的**：
 *   每只独立掷命中，扑空一只这串就断。可能是可怜的一下，也可能一连十下。它卖的是「不知道会有几只」。
 *
 * 三幕：
 *   起（windup，提交前）：施法者身边先亮起集结的尘土与细小身影，只播预告。
 *   集（gather，提交后）：按 `muster` 在身边把伙伴叫齐，尘土在脚边打转。
 *   扑（volley，提交后）：从目标四周的集结环上，一只接一只朝目标扑去（外观是小身影，带追踪）：
 *       每只到位结算一段 `swarm` 接触+切割伤害；每只独立掷 `accuracy`，落空或飞过就收场（scatter）；
 *       命中的间隔由 `gap` 决定，上限 `comrades`。整串结束才收招。
 *
 * 与同族分开：三连箭是三支箭**同时**离弦、骨头回力镖是**同一根骨头去与回**；鼠数儿是**先后不断加入的伙伴**，
 *   长度随机、每只都可能落空——这三招的「多段」结构各不相同。
 *
 * 配置 `swarm` 由公式改上限、威力、命中率与间隔，提交后才触碰世界；伙伴是动作拥有的追踪投射物。
 */
namespace PokemonSkills {
    const populationbombScene = "world_combat:move_populationbomb";
    const populationbombMissText = "world_combat.move.populationbomb.text.miss";
    const populationbombCapText = "world_combat.move.populationbomb.text.cap";

    define({
        id: "populationbomb",
        cooldownParameter: "recharge",
        name: "鼠数儿",
        description: "伙伴们会纷纷赶来集合，以群体行动给予对手攻击。连续命中 1～10 次。",
        uses: ["叫来一队伙伴连续扑击", "对残血目标用不确定长度的连段收尾", "在对手来不及还手前堆出一串小伤害"],
        kind: "enemy",
        range: 7,
        maxRange: 12,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        maximumTicks: 240,
        style: "swarm",
        defaults: { swarm: true, ai: { maxChase: 9, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("populationbomb", "reach", pokemon), geometry: "area", style: "swarm",
                color: 0xC9B78A, label: config && config.swarm === true ? "鼠海" : "精锐合击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["populationbomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("populationbomb", "tempo", context)),
                recover: Math.round(p("populationbomb", "recover", context)),
                cooldown: Math.round(p("populationbomb", "recharge", context)),
                active: skills["populationbomb"].active,
                range: p("populationbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("populationbomb:muster", populationbombScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", swarm: config && config.swarm === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const max = Math.max(1, Math.min(10, Math.round(p("populationbomb", "comrades", action))));
            const pounce = p("populationbomb", "swarm", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p("populationbomb", "accuracy", action)));
            const gap = Math.max(2, Math.round(p("populationbomb", "gap", action)));
            const speed = Math.max(0.4, p("populationbomb", "flight", action));
            const radius = p("populationbomb", "radius", action);
            const ring = Math.max(1.5, p("populationbomb", "ring", action));
            const lurk = Math.max(0.2, p("populationbomb", "lurk", action));
            const motes = Math.max(6, Math.round(p("populationbomb", "motes", action)));
            const muster = Math.max(2, Math.round(p("populationbomb", "muster", action)));
            const swarmMode = !!(config && config.swarm === true);
            const scale = Math.max(0.6, Math.min(2.0, ring / 3.5));
            const intensity = Math.max(0.6, Math.min(2.4, pounce / 13));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function volley(current: CombatAction): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (victimBody === null) { finish(current); return; }
                if (index >= max) {
                    WorldFeedback.emit(scope, populationbombScene, 1, victimBody.position(),
                        { moment: "scatter", target: targetRef, count: index, total: max, scale: scale, capped: 1 }, 24);
                    WorldFeedback.text(scope, victimBody.position().plus(WorldCombat.point(0, victimBody.height() + 0.2, 0)),
                        populationbombCapText, [index], 28);
                    finish(current);
                    return;
                }
                if (scope.random() >= accuracy) {
                    WorldFeedback.emit(scope, populationbombScene, 1, victimBody.position(),
                        { moment: "whiff", target: targetRef, count: index + 1, total: max, scale: scale }, 22);
                    WorldFeedback.text(scope, victimBody.position().plus(WorldCombat.point(0, victimBody.height() + 0.2, 0)),
                        populationbombMissText, [index + 1], 26);
                    finish(current);
                    return;
                }
                const angle = index * 2.399963229728653 + scope.random() * 0.6;
                const centre = victimBody.position();
                const origin = centre.plus(WorldCombat.point(Math.cos(angle) * ring, lurk, Math.sin(angle) * ring));
                let heading = centre.minus(origin);
                if (heading.length() < 0.05) heading = WorldCombat.point(0, 0, 1);
                const distance = heading.length();
                heading = heading.unit();
                const appearance: any = { sprite: "cobblemon:particle/generic/ground_bugs", scale: 0.9, glow: true };
                // 伙伴本体只是可见的投递：命中与否由每只独立的 accuracy 掷决定，不交给飞行物理，
                // 所以先放进一段飞行的表现，再在到达时刻按掷签结算（原生 multiaccuracy 的即时读法）。
                const arrival = Math.max(2, Math.round(distance / Math.max(0.2, speed)));
                const flight = current.projectile(origin, heading.scale(speed), 0, radius, distance + 2, arrival + 20,
                    function () { }, function () { }, JSON.stringify(appearance));
                WorldFeedback.keep(scope, "populationbomb:comrade:" + String(action.id()) + ":" + index, populationbombScene, 1, origin,
                    { moment: "rush", target: targetRef, projectile: flight, count: index + 1, total: max,
                        direction: [heading.x(), heading.y(), heading.z()], scale: scale, intensity: intensity }, arrival + 30);
                current.after(arrival, function (inner: CombatAction) {
                    const innerWorld = inner.world();
                    const struck = innerWorld.actor(targetRef);
                    const struckBody = struck !== null && innerWorld.valid(struck) ? innerWorld.observe(struck) : null;
                    if (struckBody === null) { finish(inner); return; }
                    const landed = hurt(inner, struck!, "populationbomb", pounce,
                        { damage: damageSpec("populationbomb", "swarm"), contact: true, slice: true });
                    WorldFeedback.emit(innerWorld, populationbombScene, 1, struckBody.position(),
                        { moment: landed ? "hit" : "whiff", target: targetRef, count: index + 1, total: max,
                            motes: motes, scale: scale, intensity: intensity }, 22);
                    sound(inner, "minecraft:entity.player.attack.sweep");
                    index++;
                    if (index >= max) {
                        WorldFeedback.emit(innerWorld, populationbombScene, 1, struckBody.position(),
                            { moment: "scatter", target: targetRef, count: index, total: max, scale: scale, capped: 1 }, 24);
                        WorldFeedback.text(innerWorld, struckBody.position().plus(WorldCombat.point(0, struckBody.height() + 0.2, 0)),
                            populationbombCapText, [index], 28);
                        finish(inner);
                        return;
                    }
                    inner.after(gap, volley);
                });
            }

            WorldFeedback.emit(world, populationbombScene, 1, body.position().plus(WorldCombat.point(0, 0.1, 0)),
                { moment: "gather", count: motes, total: max, scale: scale, swarm: swarmMode ? 1 : 0, intensity: intensity }, muster + 24);
            sound(action, "minecraft:entity.rabbit.ambient");
            action.after(muster, volley);
        }
    });
}
