/**
 * 吞下 / swallow 的执行组织。
 *
 * 核心念头：把攒在身体里的那口力咽下去，化成一波回复。它是「蓄力」的兑现——层数攒得越满，这一口回得越足，
 *   满三层时一次回满。等满再吞是收益也是风险：这段时间壳会被打掉。
 *
 * 两幕：
 *   咽（windup 播「含住」，提交前只观察与预告，可被打断，打断不花代价）。
 *   化开（提交后）：按共享身份 world_combat:status/stockpile 读出层数、算出这次回复，一层不留地消费掉它；
 *     一口吞＝一次大回波；慢咽＝分三小口，边回边补新受的伤。挂上「咽力」标记。
 * 结束：咽力标记走完只是消化完毕，随后淡去。
 *
 * 与蓄力的接线：层数只按共享身份读（amplifier = 层数），消费也用 MobEffects.consumeTagged 按 tag 移除；
 *   蓄力单元自己的 mob_effect_removed 处理会把每层的防御/特防收回，这里不需要也不该重复处理。
 * 与同族分开：水流环是持续小口、扎根是钉地慢回；吞下是一次性爆发回血，回多少全看攒了几层。
 */
namespace PokemonSkills {
    const swallowScene = "world_combat:move_swallow";
    const swallowEffect = "world_combat:swallowed";
    const swallowTextGulp = "world_combat.move.swallow.text.gulp";
    const swallowTextSip = "world_combat.move.swallow.text.sip";
    /** 表现里的参考半径：`data.scale = 实际回光半径 / 这个数`。 */
    const swallowReferenceRadius = 1.4;
    /** 慢咽分几口。 */
    const swallowSips = 3;

    function swallowAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }
    function swallowRound(value: number): number { return Math.round(value * 10) / 10; }

    define({
        id: "swallow",
        cooldownParameter: "wait",
        name: "Swallow",
        description: "把积蓄的力量吞下，回复自己的 HP。积蓄得越多，回复越大；吞下会把积蓄全部消耗掉。",
        uses: ["攒满三层蓄力后一口回满，把血线拉回来", "被追击时把攒下的层数兑现成回复", "慢咽分几口回，减少治疗溢出"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 5,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "gulp",
        stationary: true,
        maximumTicks: 400,
        defaults: { sipping: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "gulp", color: 0xF0B23A, label: config && config.sipping === true ? "吞下 · 慢咽" : "吞下" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["swallow"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("swallow", "tempo", context)),
                recover: Math.round(p("swallow", "aftercast", context)),
                cooldown: Math.round(p("swallow", "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            if (swallowLayers(world, self) <= 0) return "no-power";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_swallow:hold", swallowScene, 1, action.origin(),
                JSON.stringify({ moment: "hold", sip: config && config.sipping === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const layers = swallowLayers(world, self);
            if (layers <= 0) { done(action); return; }
            const worth = Math.max(0, Math.min(1, p("swallow", "worth", action)));
            const sipping = !!(config && config.sipping);
            const digestTicks = Math.max(20, Math.round(p("swallow", "digestTicks", action)));
            const motes = Math.max(8, Math.round(p("swallow", "motes", action)));
            const spread = Math.max(0.6, p("swallow", "spread", action));
            const scale = spread / swallowReferenceRadius;
            MobEffects.apply(world, self, swallowEffect, sipping ? digestTicks : Math.min(digestTicks, 30), layers);
            MobEffects.consumeTagged(world, self, swallowPowerTag);
            if (sipping) {
                const step = Math.max(1, Math.round(digestTicks / swallowSips)), share = worth / swallowSips;
                let index = 0, settled = false;
                const finish = function (current: CombatAction): void { if (!settled) { settled = true; done(current); } };
                const sipStep = function (current: CombatAction): void {
                    const scope = current.world();
                    if (!scope.valid(self)) { finish(current); return; }
                    const healed = heal(scope, self, share, "swallow");
                    const now = scope.observe(self);
                    if (now !== null) {
                        WorldFeedback.emit(scope, swallowScene, 1, now.position(),
                            { moment: "sip", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale,
                                healed: swallowRound(healed), index: index + 1, sips: swallowSips,
                                intensity: Math.max(0.6, Math.min(2, 0.7 + layers / 3 + healed / Math.max(1, now.maxHealth()) * 8)) }, 20);
                        scope.sound("minecraft:entity.generic.drink", now.position(), 10, "{}");
                    }
                    index++;
                    if (index >= swallowSips) { finish(current); return; }
                    current.after(step, sipStep);
                };
                WorldFeedback.emit(world, swallowScene, 1, body.position(),
                    { moment: "hold", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale }, 16);
                WorldFeedback.text(world, swallowAbove(body.position()), swallowTextSip, [layers, Math.round(worth * 100)], 26);
                world.sound("minecraft:item.honey_bottle.drink", body.position(), 14, "{}");
                sipStep(action);
                return;
            }
            const healed = heal(world, self, worth, "swallow");
            WorldFeedback.emit(world, swallowScene, 1, body.position(),
                { moment: "wash", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale,
                    healed: swallowRound(healed),
                    intensity: Math.max(0.7, Math.min(2, 0.8 + layers / 3 + healed / Math.max(1, body.maxHealth()) * 10)) }, 30);
            WorldFeedback.text(world, swallowAbove(body.position()), swallowTextGulp, [layers, Math.round(worth * 100)], 28);
            world.sound("minecraft:item.honey_bottle.drink", body.position(), 14, "{}");
            if (healed > 0) world.sound("minecraft:entity.player.levelup", body.position(), 12, "{}");
            done(action);
        }
    });

    // 咽力标记走完（或未满就结束）：消化完毕，回光散去。
    WorldCombat.on("world_combat:move_swallow/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== swallowEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, swallowScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 20);
    });
}
