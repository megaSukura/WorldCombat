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
        cooldownParameter: "recharge",
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
            const intensity = Math.max(0.5, Math.min(2.2, power / 85));
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, nightdazeScene, 1, centre,
                    { moment: hits > 0 ? "settle" : "miss", radius: radius, crest: crest, motes: motes,
                        hits: hits, intensity: intensity }, 30);
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
                        // 暗波被实墙截住：当前波前到不了墙后的人；暗色视觉不赋予穿墙新优势。
                        if (!scope.clear(centre, facts.position())) return;
                        struck[ref] = true;
                        if (!hurt(current, enemy, nightdazeId, power, { damage: damageSpec(nightdazeId, "surge") })) return;
                        hits++;
                        // 只有实际降了命中或载体真的挂上才报「罩住」，被免疫/封顶时不假装成功。
                        let carried = false, lost = 0;
                        if (scope.valid(enemy) && scope.random() < chance) {
                            const dropped = NativeEffects.boost(scope, enemy, "accuracy", -stages);
                            if (dropped < 0) lost = -dropped;
                            carried = MobEffects.apply(scope, enemy, nightdazeEffect, shroud, 0) !== null;
                            if (carried && scope.effects(enemy, nightdazeLinger).length === 0)
                                scope.effect(nightdazeLinger, enemy, "{}", Math.max(1, Math.min(2400, shroud)));
                        }
                        const away = facts.position().minus(centre);
                        if (scope.valid(enemy) && away.length() > 0.2)
                            scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                        WorldFeedback.emit(scope, nightdazeScene, 1, facts.position(),
                            { moment: "hit", target: ref, stages: lost, shrouded: carried ? 1 : 0,
                                motes: motes, intensity: intensity }, 26);
                        if (carried)
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), nightdazeShroudText, [lost > 0 ? lost : stages], 32);
                        else if (lost > 0)
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), nightdazeAimText, [lost], 32);
                    });
                // 只在当前波前显示暗波：radius 就是本层真实世界半径，不再叠 scale；keep 续到末步后由反馈实例收尾。
                WorldFeedback.keep(scope, "nightdaze:wave:" + String(current.actor().ref()), nightdazeScene, 1, centre,
                    { moment: "wave", radius: outer, crest: crest, motes: motes,
                        progress: (step + 1) / steps, eclipse: eclipse ? 1 : 0 }, 16);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.emit(world, nightdazeScene, 1, centre,
                { moment: "burst", crest: crest, motes: motes, intensity: intensity }, 30);
            advance(action);
        }
    });

    // 笼罩存续的托管窗口：每次巡检读当前 carrier（刷新自然拿到最新 revision），头顶暗尘绑在窗口自己身上；
    // 窗口随载体到期、被牛奶／`/effect clear`清掉或载体被替换时结束，不留失效锚或驱散后的残留。
    function nightdazeLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, nightdazeEffect);
        if (carrier === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "linger", nightdazeScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), motes: 10 });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 12, "{}");
    }
    WorldCombat.effect(nightdazeLinger, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid night daze linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(nightdazeLinger, "start", nightdazeLingerWatch);
    WorldCombat.effectHandler(nightdazeLinger, "watch", nightdazeLingerWatch);
    WorldCombat.effectHandler(nightdazeLinger, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 黑暗散去（或被外力清掉）：立即撤掉托管窗口，再在目标身上补一记「见光」，让笼罩有明确的结束。
    WorldCombat.on("world_combat:move_nightdaze/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nightdazeEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, nightdazeLinger).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, nightdazeScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });
}
