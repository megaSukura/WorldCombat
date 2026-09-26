/**
 * 寄生种子 / leechseed —— 执行组织与逐刻抽取。
 *
 * 核心念头：把一粒种子种进对手身上，让它扎下根去，每隔一会儿从它身上抽一口回自己身上；
 *   根一旦扎下就一直连到对方倒下、被人清掉，或自己枯萎。
 *
 * 三幕：
 *   抛（throw，提交后）：沿自由瞄准方向抛出一颗种子；命中活体即种下，墙与空放只让种子落地。
 *   扎（root）：目标身上挂上共享身份 world_combat:status/leechseed 的真实 MobEffect（物品栏可见、/effect 可用），
 *     并创建一枚**托管标记** world_combat:leech_seed_mark：标记的 source 就是施法者，target 是宿主，
 *     所以伤害、权限与归属都真实来自种植者；标记用 leaseMobEffect 拥有这颗真实载体，施法者离场、标记清除都即时收藤。
 *   抽（drain × N）：标记自己按 `interval` 刻从宿主身上抽走 `drain` 比例的最大生命，
 *     实抽到的量回补施法者；治疗反馈只报真实治疗量，满血或禁疗时不出现假回血。
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
    export const leechSeedSeededText = "world_combat.move.leechseed.text.seeded";

    WorldCombat.effect(leechSeedMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid leech seed source");
        if (typeof value.carrier !== "string" || !value.carrier) throw new Error("Invalid leech seed carrier");
        ["interval", "drain", "max", "vines"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid leech seed value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 标记开抽：确认自己仍拥有那颗真实载体（key 相符）才认领，然后按自己的钟排下一口。
    WorldCombat.effectHandler(leechSeedMark, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.read(world, victim, leechSeedEffect);
        if (carrier === null || String(carrier.key()) !== state.carrier) { effect.end(); return; }
        // 让托管标记真正拥有这颗载体：施法者离场、标记结算或脚本失败都会即时把它收掉。
        MobEffects.bind(world, victim, leechSeedEffect, carrier);
        const body = world.observe(victim);
        if (body !== null) WorldFeedback.onEffect(world, effect.id(), "world_combat:move_leechseed/bound/" + String(victim.ref()),
            leechSeedScene, 1, body.position(),
            { moment: "bound", target: String(victim.ref()), vines: Math.max(1, Math.round(state.vines)),
                intensity: Math.max(0.5, Math.min(2, state.vines / 10)) });
        effect.schedule("drain", "drain", Math.max(1, Math.round(state.interval)), "{}");
    });
    WorldCombat.effectHandler(leechSeedMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 标记收藤：只移除本次认领的那颗载体（key 相符），旧种枯萎不会误删后来者；宿主还在就播枯萎。
    WorldCombat.effectHandler(leechSeedMark, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), state = JSON.parse(effect.state());
        if (world.valid(victim) && typeof state.carrier === "string") {
            const carrier = MobEffects.read(world, victim, leechSeedEffect);
            if (carrier !== null && String(carrier.key()) === state.carrier)
                world.removeMobEffect(victim, leechSeedEffect, state.carrier);
        }
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, leechSeedScene, 1, body.position(), { moment: "wither", target: String(victim.ref()) }, 22);
        world.sound("minecraft:block.vine.break", body.position(), 10, "{}");
    });

    /** 宿主是否已被本次或他人留下的活根寄生；载体的 key 与活标记相符才算数。 */
    function leechSeedOccupied(world: CombatWorld, victim: CombatActor): boolean {
        if (!CombatStatus.has(world, victim, "leechseed")) return false;
        const carrier = MobEffects.read(world, victim, leechSeedEffect);
        const views = world.effects(victim, leechSeedMark);
        for (let i = 0; i < views.length; i++) {
            try {
                const state = JSON.parse(String(views[i].data()));
                if (carrier !== null && String(carrier.key()) === state.carrier) return true;
            } catch (error) { }
        }
        return false;
    }

    /** 草属性身上不生根；其他战斗者类型表为空，照常被种。 */
    export function leechSeedImmune(world: CombatWorld, actor: CombatActor): boolean {
        return PokemonDamage.combatants.read(world, actor).types.indexOf("grass") >= 0;
    }

    // 抽一口：标记仍拥有载体就从宿主身上按真实失血抽回施法者，治疗只按实际回量报表现。
    WorldCombat.effectHandler(leechSeedMark, "drain", function (effect) {
        const world = effect.world(), victim = effect.target(), caster = effect.source(), state = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.read(world, victim, leechSeedEffect);
        if (carrier === null || String(carrier.key()) !== state.carrier) { effect.end(); return; }
        const held = world.observe(victim), holder = world.valid(caster) ? world.observe(caster) : null;
        if (held === null || holder === null) { effect.end(); return; }
        const amount = Math.max(1, Math.round(held.maxHealth() * state.drain));
        const loss = -world.health(victim, -amount, "world_combat:leechseed");
        if (loss > 0) {
            const healed = world.health(caster, loss, "world_combat:leechseed");
            const vines = Math.max(1, Math.round(state.vines));
            const span = holder.position().minus(held.position()).length();
            const flow = span < 0.05 ? WorldCombat.point(0, 1, 0) : holder.position().minus(held.position()).unit();
            const flowSpeed = Math.max(0.08, Math.min(2.4, span / 11));
            WorldFeedback.emit(world, leechSeedScene, 1, held.position(),
                { moment: "drain", target: String(victim.ref()), vines: vines, amount: Math.round(loss * 10) / 10,
                    direction: [flow.x(), flow.y(), flow.z()], span: span, flowSpeed: flowSpeed,
                    intensity: Math.max(0.6, Math.min(2.2, loss / Math.max(1, held.maxHealth()) * 18)) }, 24);
            WorldFeedback.text(world, held.position().plus(WorldCombat.point(0, 1.0, 0)), leechSeedDrainText,
                [Math.round(loss * 10) / 10], 22);
            // 只有真的回上了血才在施法者身上亮绿点；满血或禁疗时不产生假回血数字。
            if (healed > 0) WorldFeedback.emit(world, leechSeedScene, 1, holder.position(),
                { moment: "heal", target: String(caster.ref()), healed: Math.round(healed * 10) / 10,
                    intensity: Math.max(0.5, Math.min(2, healed / Math.max(1, holder.maxHealth()) * 24)) }, 20);
            world.sound("minecraft:block.sweet_berry_bush.pick_berries", held.position(), 12, "{}");
        }
        // 没被提前结束就按自己的钟继续抽。
        effect.schedule("drain", "drain", Math.max(1, Math.round(state.interval)), "{}");
    });

    // 牛奶／/effect clear 或别的原因把这颗载体拿掉时，只结束拥有它的那条标记，不波及新种。
    WorldCombat.on("world_combat:move_leechseed/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== leechSeedEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const carrier = MobEffects.read(world, actor, leechSeedEffect);
        const views = world.effects(actor, leechSeedMark);
        for (let i = 0; i < views.length; i++) {
            let state: any = {};
            try { state = JSON.parse(String(views[i].data())); } catch (error) { continue; }
            if (carrier === null || String(carrier.key()) !== state.carrier)
                world.operation(views[i].id(), "world_combat:dispel", "{}");
        }
    });

    define({
        id: leechSeedId,
        cooldownParameter: "recharge",
        name: "Leech Seed",
        description: "沿瞄准方向抛出一粒种子：命中敌人后根扎进它身上，每隔一会儿抽走它一口最大生命回补自己。种子到期、被清除、目标倒下或施放者离场都会枯萎；草属性和已被寄生的目标种不活，墙会挡下种子，空放只让它落地。",
        uses: ["把硬仗拖成消耗战，一点点把自己养回来", "在对手身上留一根持续的抽血线", "配合拉开距离，让根替自己耗血"],
        kind: "aim",
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
        // 自由瞄准：只确认施法者还在，方向与首碰者交给真实弹道；不因未碰的目标已有种、草免疫或友方而拒绝投掷。
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!world.valid(self) || world.observe(self) === null) return "invalid-target";
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
                    // 墙、友方与空气都只让种子停下；只有真实活体敌人进入下面的种植判定。
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(),
                            { moment: hit.hitEntity() ? "fizzle" : "splat" }, 16);
                        return;
                    }
                    if (leechSeedImmune(scope, victim)) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "immune", target: String(victim.ref()) }, 20);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 0.95, 0)), leechSeedImmuneText, [], 24);
                        return;
                    }
                    if (leechSeedOccupied(scope, victim)) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "immune", target: String(victim.ref()) }, 20);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 0.95, 0)), leechSeedSeededText, [], 24);
                        return;
                    }
                    if (!CombatStatus.apply(scope, victim, "leechseed", leechSeedEffect, ticks, 0, { unique: true })) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "immune", target: String(victim.ref()) }, 20);
                        return;
                    }
                    const carrier = MobEffects.read(scope, victim, leechSeedEffect);
                    if (carrier === null) {
                        WorldFeedback.emit(scope, leechSeedScene, 1, hit.position(), { moment: "fizzle" }, 16);
                        return;
                    }
                    scope.effect(leechSeedMark, victim,
                        JSON.stringify({ caster: String(current.actor().ref()), interval: interval, drain: drain,
                            max: ticks, vines: vines, carrier: String(carrier.key()) }), ticks);
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
