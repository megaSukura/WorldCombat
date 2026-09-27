/** Consume the actual shared stockpile once, then restore health from the paid layer snapshot. */
namespace PokemonSkills {
    const swallowScene = "world_combat:move_swallow";
    const swallowEffect = "world_combat:swallowed";
    const swallowTextGulp = "world_combat.move.swallow.text.gulp";
    const swallowTextSip = "world_combat.move.swallow.text.sip";
    const swallowTextFull = "world_combat.move.swallow.text.full";
    const swallowTextDenied = "world_combat.move.swallow.text.denied";
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
        description: "把积蓄的力量吞下化为回复：层数越多回得越多，满三层最多一口回满，同时消耗全部积蓄（连蓄力提供的防御与特防一起收回）。",
        uses: ["攒满三层蓄力，把层数兑现成最大的一口回复", "被追击时把攒下的层数兑现成回复", "慢咽分几口回，减少治疗溢出"],
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
                JSON.stringify({ moment: "hold", layers: swallowLayers(action.sense(), action.actor()), sip: config && config.sipping === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const consumed = MobEffects.consumeTagged(world, self, swallowPowerTag);
            const layers = consumed.reduce((count, value) => Math.max(count, Math.min(3, value.amplifier())), 0);
            if (layers <= 0) { done(action); return; }
            action.data("world_combat:swallow/layers", JSON.stringify({ layers: layers }));
            const worth = Math.max(0, Math.min(1, p("swallow", "worth", action)));
            const sipping = !!(config && config.sipping);
            const digestTicks = Math.max(20, Math.round(p("swallow", "digestTicks", action)));
            const motes = Math.max(8, Math.round(p("swallow", "motes", action)));
            const spread = Math.max(0.6, p("swallow", "spread", action));
            const scale = spread / swallowReferenceRadius;
            // 封疗时那口力照常被收走，但一口也回不出来：只出无效回执，不铺回光、也不铺咽力标记。
            if (CombatStatus.has(world, self, "healblock")) {
                WorldFeedback.emit(world, swallowScene, 1, body.position(),
                    { moment: "denied", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale }, 26);
                WorldFeedback.text(world, swallowAbove(body.position()), swallowTextDenied, [layers], 26);
                done(action);
                return;
            }
            MobEffects.apply(world, self, swallowEffect, sipping ? digestTicks : Math.min(digestTicks, 30), layers);
            if (sipping) {
                // 慢咽：第 1..3 口分别落在 1/3、2/3、3/3 处，最后一口与标称消化窗口末端对齐，实际结束不再早于窗口。
                const step = Math.max(1, Math.floor(digestTicks / swallowSips)), share = worth / swallowSips;
                let index = 0, settled = false, denied = false, restored = 0;
                const finish = function (current: CombatAction): void { if (!settled) { settled = true; done(current); } };
                const sipStep = function (current: CombatAction): void {
                    const scope = current.world();
                    if (!scope.valid(self)) { finish(current); return; }
                    const healed = heal(scope, self, share, "swallow");
                    const now = scope.observe(self);
                    if (now !== null) {
                        if (healed > 0) {
                            restored += healed;
                            WorldFeedback.emit(scope, swallowScene, 1, now.position(),
                                { moment: "sip", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale,
                                    healed: swallowRound(healed), index: index + 1, sips: swallowSips,
                                    intensity: Math.max(0.6, Math.min(2, 0.7 + layers / 3 + healed / Math.max(1, now.maxHealth()) * 8)) }, 20);
                            scope.sound("minecraft:entity.generic.drink", now.position(), 10, "{}");
                        } else if (!denied && CombatStatus.has(scope, self, "healblock")) {
                            // 咽到一半才被封疗：明确显示这一口被挡回，不再假报成功。
                            denied = true;
                            WorldFeedback.emit(scope, swallowScene, 1, now.position(),
                                { moment: "denied", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale,
                                    index: index + 1, sips: swallowSips }, 22);
                        }
                    }
                    index++;
                    if (index >= swallowSips) {
                        const at = swallowAbove(now !== null ? now.position() : body.position());
                        if (restored > 0) WorldFeedback.text(scope, at, swallowTextSip, [layers, swallowRound(restored)], 26);
                        else if (denied) WorldFeedback.text(scope, at, swallowTextDenied, [layers], 24);
                        else WorldFeedback.text(scope, at, swallowTextFull, [layers], 24);
                        finish(current); return;
                    }
                    current.after(step, sipStep);
                };
                WorldFeedback.emit(world, swallowScene, 1, body.position(),
                    { moment: "hold", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale }, 16);
                world.sound("minecraft:item.honey_bottle.drink", body.position(), 14, "{}");
                action.after(step, sipStep);
                return;
            }
            const healed = heal(world, self, worth, "swallow");
            if (healed > 0) {
                WorldFeedback.emit(world, swallowScene, 1, body.position(),
                    { moment: "wash", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale,
                        healed: swallowRound(healed),
                        intensity: Math.max(0.7, Math.min(2, 0.8 + layers / 3 + healed / Math.max(1, body.maxHealth()) * 10)) }, 30);
                WorldFeedback.text(world, swallowAbove(body.position()), swallowTextGulp, [layers, swallowRound(healed)], 28);
                world.sound("minecraft:item.honey_bottle.drink", body.position(), 14, "{}");
                world.sound("minecraft:entity.player.levelup", body.position(), 12, "{}");
            } else if (CombatStatus.has(world, self, "healblock")) {
                WorldFeedback.emit(world, swallowScene, 1, body.position(),
                    { moment: "denied", actor: String(self.ref()), layers: layers, motes: motes, spread: spread, scale: scale }, 26);
                WorldFeedback.text(world, swallowAbove(body.position()), swallowTextDenied, [layers], 26);
            } else {
                // 满血溢出：这口力没有变成回复，只留一行说明，不铺亮色回光冒充成功治疗。
                WorldFeedback.text(world, swallowAbove(body.position()), swallowTextFull, [layers], 24);
            }
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
