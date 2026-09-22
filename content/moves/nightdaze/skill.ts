/**
 * 暗黑爆破 / nightdaze 的出手方式。
 *
 * 核心念头：**一团漆黑从自身炸开、向四周推出去**。暗色半球以施法者为心一圈圈往外扩，连空中一起吞进来；
 *   被卷进去的人挨一记暗波、被向外震开，眼睛陷进黑暗里、此后瞄不准。它是本族唯一**含空中、以自身为心**的
 *   招，也是本族威力最大、笼罩概率最高的一招。
 *
 * 三幕：
 *   起（windup，提交前）：周身的光往身上沉、脚下压起一团将炸未炸的黑，只播预告（可被打断）。
 *   爆（burst → wave → hit）：提交后暗波按 `waveTicks` 圈一圈圈向外推；每圈罩到的非友方（最多 `maxTargets` 个）
 *       各吃一次 `surge`，被沿离中心方向推开 `push`，有 `shroudChance` 概率掉 `shroudStages` 级命中、
 *       带上共享身份 `world_combat:status/shrouded`。
 *   收（settle / miss）：推到最后暗波拍散；一个人都没罩到就播一个空爆。
 *
 * 与同族分开：冲浪是水、重踏只走地面、魔法闪耀是光；暗黑爆破是**含空中的整圈暗波**，压的是命中。
 * 命中下降走共享能力等级（NativeEffects.boost 的 accuracy）落到原生命中等级，同时挂真实 MobEffect
 * （身份 shrouded + 伞身份 aim_impaired），对其他战斗者落到攻击变弱。
 */
namespace PokemonSkills {
    define({
        id: nightdazeId,
        name: "Night Daze",
        description: "从自身炸开一团漆黑，一圈圈向四周推出去：身周（含空中）的敌人各挨一记暗波、被向外震开，有概率被黑暗罩住、掉命中。蚀夜式铺得更大更久更黏，爆发式更重、把贴身的顶得更开。",
        uses: ["被围住时一次罩住身边一圈敌人", "连飞在天上的目标一起打到", "削掉一整圈对手的命中，留出撤退或反打的空间"],
        kind: "self",
        range: 4.2,
        maxRange: 7,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 48,
        style: "nightburst",
        defaults: { eclipse: false, ai: { maxChase: 8, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(nightdazeId, "waveRadius", pokemon), geometry: "area", style: "nightburst",
                color: 0x2A2340, label: config && config.eclipse === true ? "暗黑爆破·蚀夜" : "暗黑爆破" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[nightdazeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(nightdazeId, "tempo", context)),
                recover: Math.round(p(nightdazeId, "aftercast", context)),
                cooldown: Math.round(p(nightdazeId, "recharge", context)),
                active: 0,
                range: p(nightdazeId, "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("nightdaze:gather", nightdazeScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", motes: Math.round(p(nightdazeId, "motes", action)),
                    eclipse: config && config.eclipse === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2, p(nightdazeId, "waveRadius", action));
            const power = p(nightdazeId, "surge", action);
            const crest = Math.max(1.5, p(nightdazeId, "crest", action));
            const steps = Math.max(3, Math.round(p(nightdazeId, "waveTicks", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p(nightdazeId, "shroudStages", action))));
            const chance = Math.max(0.1, Math.min(0.85, p(nightdazeId, "shroudChance", action)));
            const shroud = Math.max(50, Math.round(p(nightdazeId, "shroudTicks", action)));
            const push = Math.max(0.1, p(nightdazeId, "push", action));
            const cap = Math.max(1, Math.round(p(nightdazeId, "maxTargets", action)));
            const motes = Math.max(10, Math.round(p(nightdazeId, "motes", action)));
            const eclipse = !!(config && config.eclipse);
            const scale = Math.max(0.5, Math.min(2.2, radius / 4.2));
            const intensity = Math.max(0.5, Math.min(2.2, power / 85));
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, nightdazeScene, 1, centre,
                    { moment: hits > 0 ? "settle" : "miss", radius: radius, crest: crest, motes: motes,
                        scale: scale, hits: hits, intensity: intensity }, 30);
                if (hits === 0)
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.1, 0)), nightdazeMissText, [], 24);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / steps, inner = Math.max(0, radius * step / steps - 0.3);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2.4, above: crest }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === String(current.actor().ref()) || struck[ref] || hits >= cap) return;
                        struck[ref] = true;
                        if (!hurt(current, enemy, nightdazeId, power, { damage: damageSpec(nightdazeId, "surge") })) return;
                        hits++;
                        let shrouded = false;
                        if (scope.valid(enemy) && scope.random() < chance) {
                            shrouded = true;
                            NativeEffects.boost(scope, enemy, "accuracy", -stages);
                            MobEffects.apply(scope, enemy, nightdazeEffect, shroud, 0);
                        }
                        const away = facts.position().minus(centre);
                        if (scope.valid(enemy) && away.length() > 0.2)
                            scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                        WorldFeedback.emit(scope, nightdazeScene, 1, facts.position(),
                            { moment: "hit", target: ref, stages: stages, shrouded: shrouded ? 1 : 0,
                                motes: motes, intensity: intensity, scale: scale }, 26);
                        if (shrouded)
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), nightdazeShroudText, [stages], 32);
                    });
                WorldFeedback.keep(scope, "nightdaze:wave:" + String(current.actor().ref()), nightdazeScene, 1, centre,
                    { moment: "wave", radius: outer, crest: crest, motes: motes, scale: scale,
                        progress: (step + 1) / steps, eclipse: eclipse ? 1 : 0 }, 12);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.emit(world, nightdazeScene, 1, centre,
                { moment: "burst", radius: radius, crest: crest, motes: motes, scale: scale, intensity: intensity }, 30);
            advance(action);
        }
    });

    // 黑暗散去（或被外力清掉）：在目标身上补一记「见光」，让笼罩有明确的结束。
    WorldCombat.on("world_combat:move_nightdaze/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightdazeEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, nightdazeScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });

    // 笼罩期间，目标头顶维持一圈缓慢翻涌、慢慢散开的暗尘：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_nightdaze/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightdazeEffect || event.world().tick() % 12 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "nightdaze:shroud:" + String(actor.ref()), nightdazeScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), motes: 10 }, 40);
    });
}
