/**
 * 寄生种子 / leechseed —— 执行组织与逐刻抽取。
 *
 * 核心念头：把一粒种子种进对手身上，让它扎下根去，每隔一会儿从它身上抽一口回自己身上；
 *   根一旦扎下就一直连到对方倒下、被人清掉，或自己枯萎。
 *
 * 三幕：
 *   抛（throw，提交后）：一颗种子沿弹道飞向目标；命中即种下。
 *   扎（root）：目标身上挂上共享身份 world_combat:status/leechseed 的真实 MobEffect（物品栏可见、/effect 可用），
 *     旁边挂一枚机读标记带走施放者、间隔、抽量与起始时刻；草属性身上不生根，别人已经种过的只刷新不叠加。
 *   抽（drain × N）：每 `interval` 刻从目标身上抽走 `drain` 比例的最大生命，沿「目标→施放者」抽出一束汁流，
 *     实抽到的量回补施放者；目标倒下、施放者离场或被人解除都通向同一幕收尾。
 *
 * 与吸取分开：吸取、超级吸取、终极吸取是施法者自己咬一口、藤不脱手或分几拍；
 *   寄生种子是**把根留在对方身上**、由它自己定时继续抽——本族里唯一会留在世界里的那一招。
 */
namespace PokemonSkills {
    export const leechSeedId = "leechseed";
    export const leechSeedEffect = "world_combat:leech_seed";
    export const leechSeedMark = "world_combat:leech_seed_mark";
    export const leechSeedScene = "world_combat:move_leechseed";
    export const leechSeedRootText = "world_combat.move.leechseed.text.root";
    export const leechSeedDrainText = "world_combat.move.leechseed.text.drain";
    export const leechSeedImmuneText = "world_combat.move.leechseed.text.immune";

    WorldCombat.effect(leechSeedMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid leech seed source");
        ["interval", "drain", "start", "max", "vines"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid leech seed value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(leechSeedMark, "start", function () { });
    WorldCombat.effectHandler(leechSeedMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 标记结束（时间走完或被外部清除）时，把共享身份一并清掉，避免留下没有结算的根。
    WorldCombat.effectHandler(leechSeedMark, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (world.valid(victim) && CombatStatus.has(world, victim, "leechseed")) CombatStatus.cure(world, victim, "leechseed");
    });

    /** 目标身上当前那粒种子的标记；没有给 null。 */
    function leechSeedMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, leechSeedMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    /** 草属性身上不生根；其他战斗者类型表为空，照常被种。 */
    export function leechSeedImmune(world: CombatWorld, actor: CombatActor): boolean {
        return PokemonDamage.combatants.read(world, actor).types.indexOf("grass") >= 0;
    }

    // 抽取：种子还在身上就按自己的钟抽一口，实抽到的量回补施放者。
    WorldCombat.on("world_combat:move_leechseed/drain", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== leechSeedEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const mark = leechSeedMarkOf(world, actor);
        if (mark === null) { CombatStatus.cure(world, actor, "leechseed"); return; }
        const now = world.tick(), interval = Math.max(1, Math.round(mark.interval));
        if (!(now > mark.start) || (now - mark.start) % interval !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const caster = world.actor(String(mark.caster));
        // 施放者已经离场：根无处可回，自行枯萎，目标不再被抽。
        if (caster === null || !world.valid(caster)) { CombatStatus.cure(world, actor, "leechseed"); return; }
        const amount = Math.max(1, Math.round(body.maxHealth() * mark.drain));
        const loss = -world.health(actor, -amount, "world_combat:leechseed");
        if (loss > 0) {
            world.health(caster, loss, "world_combat:leechseed");
            const vines = Math.max(1, Math.round(mark.vines));
            WorldFeedback.emit(world, leechSeedScene, 1, body.position(),
                { moment: "drain", target: String(actor.ref()), vines: vines, amount: Math.round(loss * 10) / 10,
                    path: [String(actor.ref()), String(caster.ref())],
                    intensity: Math.max(0.6, Math.min(2.2, loss / Math.max(1, body.maxHealth()) * 18)) }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), leechSeedDrainText,
                [Math.round(loss * 10) / 10], 22);
            world.sound("minecraft:block.sweet_berry_bush.pick_berries", body.position(), 12, "{}");
        }
    });

    // 种子离开（到期、被牛奶或别的招式解除、目标倒下）：标记收掉，画面安静收尾。
    WorldCombat.on("world_combat:move_leechseed/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== leechSeedEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const views = world.effects(actor, leechSeedMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, leechSeedScene, 1, body.position(), { moment: "wither", target: String(actor.ref()) }, 22);
        world.sound("minecraft:block.vine.break", body.position(), 10, "{}");
    });

    define({
        id: leechSeedId,
        cooldownParameter: "recharge",
        name: "Leech Seed",
        description: "向一名敌人抛出一粒种子：命中后根扎进它身上，每隔一会儿抽走它一口最大生命回补自己。种子到期、被清除、目标倒下或施放者离场都会枯萎；草属性和已被寄生的目标种不活。",
        uses: ["把硬仗拖成消耗战，一点点把自己养回来", "在对手身上留一根持续的抽血线", "配合拉开距离，让根替自己耗血"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "seed",
        defaults: { gluttony: false, ai: { maxChase: 13, healBelow: 0.9, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[leechSeedId], detail: { values: config } };
            return { radius: p(leechSeedId, "reach", context), geometry: "line", style: "seed", color: 0x6FBF3F,
                label: config && config.gluttony === true ? "寄生种子·贪食" : "寄生种子" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[leechSeedId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(leechSeedId, "tempo", context)),
                recover: Math.round(p(leechSeedId, "aftercast", context)),
                cooldown: Math.round(p(leechSeedId, "recharge", context)),
                active: 1,
                range: p(leechSeedId, "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (CombatStatus.has(world, target, "leechseed")) return "already-seeded";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(leechSeedId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (leechSeedImmune(world, target)) return "immune";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_leechseed:gather", leechSeedScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", target: action.target() === null ? "" : String(action.target()!.ref()),
                    gluttony: config && config.gluttony === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), target = action.target();
            const speed = p(leechSeedId, "seedSpeed", action);
            const radius = p(leechSeedId, "seedRadius", action);
            const ticks = Math.max(60, Math.round(p(leechSeedId, "seedTicks", action)));
            const interval = Math.max(10, Math.round(p(leechSeedId, "interval", action)));
            const drain = Math.max(0.01, p(leechSeedId, "drain", action));
            const vines = Math.max(1, Math.round(p(leechSeedId, "vines", action)));
            sound(action, "minecraft:item.crop.plant");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:particle/generic/grass/seed" },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "fizzle" }, 16);
                        return;
                    }
                    if (leechSeedImmune(scope, victim)) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "immune", target: String(victim.ref()) }, 20);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 0.95, 0)), leechSeedImmuneText, [], 24);
                        return;
                    }
                    if (!CombatStatus.apply(scope, victim, "leechseed", leechSeedEffect, ticks, 0, { unique: true })) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "immune", target: String(victim.ref()) }, 20);
                        return;
                    }
                    scope.effect(leechSeedMark, victim,
                        JSON.stringify({ caster: String(current.actor().ref()), interval: interval, drain: drain,
                            start: scope.tick(), max: ticks, vines: vines }), ticks);
                    WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(),
                        { moment: "root", target: String(victim.ref()), vines: vines,
                            path: [String(current.actor().ref()), String(victim.ref())] }, 28);
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), leechSeedRootText,
                        [Math.round(ticks / 20)], 32);
                    scope.sound("minecraft:block.grass.place", hit.position(), 14, "{}");
                }
            }, done);
            WorldFeedback.emit(world, leechSeedScene, 1, action.origin(),
                { moment: "throw", projectile: flight, vines: vines, target: target === null ? "" : String(target.ref()) }, 60);
        }
    });
}
