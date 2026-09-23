/**
 * 缠绕 / constrict 的出手方式。
 *
 * 核心念头：青藤或触手从身侧伸出、沿线爬向目标，缠上并收紧——这一招伤害很低，价值全在**缠住之后**：
 * 压速度、短暂按在原地，把目标交给队友或自己的下一招。这是本族里唯一在命中后世界继续变化的一招。
 *
 * 三幕：
 *   起（reach，提交前）：触手自身侧绷起、蓄势，只播预告。
 *   缠（bind → squeeze / miss，提交后）：触手沿一条线爬向锁定的目标；到达时若目标仍在够得到的范围内，
 *       结算 `squeeze` 接触伤害、挂 trapped 身份的束缚效果、按 speedStages 压速度、短定身 holdTicks；
 *       还有 gripChance 的概率再紧一道（多压一级、随机结果）。攀缠式额外把施法者也按住一小段（selfHold）。
 *   收（hold / release）：束缚期间目标身上持续绕着一圈藤环；效果走完自己的时间，藤环散开、叶片落下。
 *
 * 与同族分开：强力鞭打远而宽、藤鞭短而快、百万吨重踢直线踢飞；缠绕是唯一的控制招，命中后留下一段持续状态。
 * 提交后才触碰世界。
 */
namespace PokemonSkills {
    const constrictScene = "world_combat:move_constrict";
    const constrictBind = "world_combat:constrict_bind";
    const constrictBindText = "world_combat.move.constrict.text.bind";
    const constrictMissText = "world_combat.move.constrict.text.miss";

    define({
        freeMovement: function (config) { return !!config.latch; },
        id: "constrict",
        cooldownParameter: "recharge",
        name: "Constrict",
        description: "青藤或触手沿线爬向目标，缠上并收紧。伤害很低，价值全在缠住之后：压速度、短暂按在原地，把目标交给队友或自己的下一招。它还会以一定概率再紧一道，多压一级速度。",
        uses: ["缠住一名跑得快的目标", "把对手按在原地交给队友", "用最低的代价给目标留一个持续减速"],
        kind: "enemy",
        range: 2.9,
        maxRange: 4.2,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 16,
        style: "grapple",
        defaults: { latch: false, ai: { maxChase: 6, preferRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("constrict", "reach", pokemon) + 0.3, geometry: "line", style: "grapple",
                color: 0x4E7A32, label: config && config.latch === true ? "缠绕·攀缠式" : "缠绕" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["constrict"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const latch = !!(config && config.latch);
            return {
                prepare: Math.round(p("constrict", "tempo", context)),
                recover: Math.round(p("constrict", "aftercast", context)),
                cooldown: Math.round(p("constrict", "recharge", context)),
                active: skills["constrict"].active,
                range: p("constrict", "reach", context) + (latch ? 0.2 : 0.35)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_constrict:reach", constrictScene, 1, action.origin(),
                JSON.stringify({ moment: "reach", latch: config && config.latch === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = action.origin();
            const reach = p("constrict", "reach", action);
            const pace = Math.max(0.3, p("constrict", "pace", action));
            const notes = Math.max(6, Math.round(p("constrict", "notes", action)));
            const selfHold = Math.max(8, Math.round(p("constrict", "selfHold", action)));
            const latch = !!(config && config.latch);
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const locked = action.targetPosition();
            const scale = reach / 2.8;
            const chest = origin.minus(WorldCombat.point(0, (self === null ? 1.4 : self.height()) * 0.15, 0));
            const gap = Math.sqrt(Math.pow(locked.x() - origin.x(), 2) + Math.pow(locked.z() - origin.z(), 2));
            const travel = Math.max(2, Math.min(10, Math.round(gap / pace)));
            let settled = false;

            sound(action, "minecraft:block.vine.place");
            WorldFeedback.emit(world, constrictScene, 1, origin,
                { moment: "bind", path: [[chest.x(), chest.y(), chest.z()], [locked.x(), locked.y(), locked.z()]],
                    notes: notes, scale: scale, latch: latch ? 1 : 0, seconds: Math.round(travel / 20 * 100) / 100 }, travel + 16);

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function miss(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(scope, constrictScene, 1, body.position(), { moment: "miss", notes: Math.round(notes * 0.7), scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), constrictMissText, [], 18);
                }
                sound(current, "minecraft:block.vine.break");
                finish(current);
            }

            /** 触手到达：缠上目标，压速度、定身、挂束缚身份。所有读目标数据的参数在这里求值。 */
            function squeeze(current: CombatAction): void {
                const scope = current.world();
                const target = targetRef === "" ? null : scope.actor(targetRef);
                const body = target === null ? null : scope.observe(target);
                const mine = scope.observe(actor);
                if (target === null || body === null || mine === null || !scope.valid(target)) { miss(current); return; }
                if (body.position().minus(mine.position()).length() > reach + 0.9) { miss(current); return; }
                const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["constrict"],
                    detail: { values: config }, world: scope, actor: actor, target: { world: scope, actor: target } };
                const power = p("constrict", "squeeze", context);
                const stages = Math.max(1, Math.round(p("constrict", "speedStages", context)));
                const boundTicks = Math.max(30, Math.round(p("constrict", "bindTicks", context)));
                const holdTicks = Math.max(8, Math.round(p("constrict", "holdTicks", context)));
                const grip = Math.max(0, Math.min(1, p("constrict", "gripChance", context)));
                const landed = hurt(current, target, "constrict", power, { damage: damageSpec("constrict", "squeeze"), contact: true });
                if (!landed || !scope.valid(target)) { miss(current); return; }
                MobEffects.apply(scope, target, constrictBind, boundTicks, 0);
                NativeEffects.boost(scope, target, "spe", -stages);
                let extra = 0;
                if (scope.random() < grip) { NativeEffects.boost(scope, target, "spe", -1); extra = 1; }
                WorldEffects.apply(scope, target, "rooted", {}, holdTicks);
                if (latch && scope.valid(actor)) WorldEffects.apply(scope, actor, "rooted", {}, selfHold);
                WorldFeedback.emit(scope, constrictScene, 1, body.position(),
                    { moment: "squeeze", target: String(target.ref()), stages: stages + extra, bound: boundTicks,
                        notes: notes, scale: scale, intensity: Math.max(0.5, Math.min(2.0, power / 14)), latch: latch ? 1 : 0 }, 26);
                WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), constrictBindText, [stages + extra], 24);
                sound(current, "cobblemon:impact.normal");
                finish(current);
            }

            action.after(travel, function (current: CombatAction) { squeeze(current); });
        }
    });

    // 束缚期间维持低密度的藤环围绕目标：少而稳，缠在身侧，让玩家看得清目标本身。
    WorldCombat.on("world_combat:move_constrict/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== constrictBind || event.world().tick() % 10 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_constrict/hold/" + String(actor.ref()), constrictScene, 1,
            body.position(), { moment: "hold", target: String(actor.ref()) }, 30);
    });

    // 束缚走完自己的时间：藤环散开、叶片落下。被外力解除同样走到这里，`cause` 保留。
    WorldCombat.on("world_combat:move_constrict/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== constrictBind) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, constrictScene, 1, body.position(), { moment: "release", target: String(actor.ref()) }, 24);
    });
}
