/**
 * 冥想 / calmmind — 执行组织。
 *
 * 核心念头：收住心神，把自己罩进一层几乎透明的清明——特攻与特防一起抬起来。它是本组里唯一抬特攻的一招，
 *   也是唯一不改变外形的一招：别的招靠体型、壳、手下，它只靠一段专注。
 *
 * 两幕：
 *   静（windup 播「凝神」，提交前只观察与预告，打断不花代价）。
 *   明（提交后）：临时特攻、特防等级挂在共享身份 world_combat:status/calmmind 的清明窗口上。
 * 结束：清明到期或被清除时，结束两项贡献。
 */
namespace PokemonSkills {
    const calmMindScene = "world_combat:move_calmmind";
    const calmMindFocus = "world_combat:calm_focus";
    const calmMindSettleText = "world_combat.move.calmmind.text.settle";
    const calmMindFadeText = "world_combat.move.calmmind.text.fade";
    /** 表现里的参考半径：`data.scale = 实际涟漪半径 / 这个数`。 */
    const calmMindReferenceRadius = 1.4;


    define({
        id: "calmmind",
        cooldownParameter: "wait",
        name: "冥想",
        description: "静心凝神，从而提高自己的特攻和特防。",
        uses: ["开场先静一息，把特攻与特防一起垫起来", "硬仗前坐深，拉锯里用浅冥想随时补", "把特防抬起来顶对面的特殊火力"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 95,
        style: "focus",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "深冥想")],
        indicator: function (config, pokemon) {
            return { radius: p("calmmind", "ripple", pokemon), geometry: "area", style: "focus", color: 0xB9A6F2,
                label: config && config.deep === true ? "冥想 · 深" : "冥想 · 浅" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["calmmind"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("calmmind", "tempo", context)),
                recover: Math.round(p("calmmind", "aftercast", context)),
                cooldown: Math.round(p("calmmind", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_calmmind:gather", calmMindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const deep = !!(config && config.deep === true);
            const insight = Math.max(1, Math.min(2, Math.round(p("calmmind", "insight", action))));
            const poise = Math.max(1, Math.min(2, Math.round(p("calmmind", "poise", action))));
            const window = Math.max(120, Math.round(p("calmmind", "stillness", action)));
            const ripple = Math.max(0.6, p("calmmind", "ripple", action));
            const motes = Math.max(12, Math.round(p("calmmind", "motes", action)));
            const breaths = Math.max(2, Math.min(4, Math.round(p("calmmind", "breaths", action))));
            const scale = ripple / calmMindReferenceRadius;
            const beforeInsight = NativeEffects.effectiveStage(world, actor, "spa"), beforePoise = NativeEffects.effectiveStage(world, actor, "spd");
            const previous = MobEffects.read(world, actor, calmMindFocus), carrier = MobEffects.apply(world, actor, calmMindFocus, window, previous ? previous.amplifier() : 0);
            const contribution = "world_combat:move/calmmind";
            let insightLevels = 0, poiseLevels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { spa: insight, spd: poise }, carrier.duration(), contribution, carrier, previous);
                insightLevels = Math.max(0, NativeEffects.effectiveStage(world, actor, "spa") - beforeInsight);
                poiseLevels = Math.max(0, NativeEffects.effectiveStage(world, actor, "spd") - beforePoise);
                const amplifier = Math.max(insightLevels, poiseLevels);
                if (carrier.amplifier() !== amplifier) {
                    const shown = MobEffects.apply(world, actor, calmMindFocus, window, amplifier);
                    if (shown) NativeEffects.boostWindow(world, actor, {}, shown.duration(), contribution, shown, carrier);
                }
            }
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, calmMindScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), insight: insightLevels, poise: poiseLevels, motes: motes,
                    breaths: breaths, scale: scale, deep: deep ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(1.8, (insightLevels + poiseLevels) / 3)) }, 34);
            WorldFeedback.keep(world, "calmmind:calm:" + String(actor.ref()), calmMindScene, 1, body.position(),
                { moment: "calm", actor: String(actor.ref()), motes: motes, scale: scale }, Math.min(window, 240));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), calmMindSettleText,
                [insightLevels, poiseLevels, Math.round(window / 20)], 32);
            world.sound("cobblemon:move.psychic.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 两项贡献随清明窗口结束；移除事件只负责收尾表现。
    WorldCombat.on("world_combat:move_calmmind/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== calmMindFocus) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, calmMindFocus)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, calmMindScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), calmMindFadeText, [], 22);
    });
}
