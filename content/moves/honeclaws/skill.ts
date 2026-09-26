/**
 * 磨爪 / honeclaws 的出手方式。
 *
 * 核心念头：抬起前爪，在身前交叠着快速刮几下，火星从爪缝里迸出来——磨出的锋口留在一段时间里，
 *   攻击与命中率各抬一档。它是本族里最快、最便宜的一支：起手短、冷却短、窗口也短，磨掉了就再补一次。
 *
 * 三幕：
 *   起势（windup，提交前）：抬爪、压低重心，冷光与细火星在爪边聚拢；可被打断，打断不消耗任何东西。
 *   磨（提交后）：物攻与命中能力等级各抬起（原生 +1，配置「深磨」物攻 +2），挂上共享身份
 *     world_combat:status/honeclaws 的锋口窗口。等级本身由 boostWindow 拥有并绑在这层锋口载体上：
 *     窗口到期、被提前清除，或再次施放刷新同一窗口时，都只会撤去本招这一次实际贡献的级数。
 *   收（收势）：锋口定住、浮出结果；窗口走完或被清除时，本招的等级随窗口自行收回。
 *
 * 与同族分开：盘蜷是慢而完整的架势（攻/防/命中三项、窗口最长）；磨爪是随手一蹭，只抬攻与命中，最快、最便宜。
 */
namespace PokemonSkills {
    const honeclawsScene = "world_combat:move_honeclaws";
    const honeclawsEdge = "world_combat:honeclaws_edge";
    const honeclawsContribution = "world_combat:move/honeclaws";
    const honeclawsText = "world_combat.move.honeclaws.text.honed";
    const honeclawsCappedText = "world_combat.move.honeclaws.text.capped";
    const honeclawsFadeText = "world_combat.move.honeclaws.text.faded";
    /** 表现里的参考半径：`data.scale = 实际刮擦半径 / 这个数`。 */
    const honeclawsReference = 0.7;

    define({
        id: "honeclaws",
        cooldownParameter: "wait",
        name: "磨爪",
        description: "抬起前爪交叠着快速刮几下，把爪子磨得更锋利：攻击与命中率各提高一级。锋口只维持一段可见的窗口，窗口走完时这两项会被收回；它起手与冷却都短，可以反复补磨。",
        uses: ["开打前先蹭两下，把攻与命中一起垫起来", "命中被削、连击失手时随手补一档", "用最短的窗口保持锋口常新"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 72,
        style: "claw",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "深磨")],
        indicator: function (config, _pokemon) {
            return { radius: honeclawsReference, geometry: "area", style: "claw", color: 0xD8E4F0,
                label: config && config.deep === true ? "磨爪 · 深磨" : "磨爪 · 快磨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["honeclaws"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("honeclaws", "tempo", context)),
                recover: Math.round(p("honeclaws", "aftercast", context)),
                cooldown: Math.round(p("honeclaws", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_honeclaws:draw", honeclawsScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("honeclaws", "rise", action))));
            const focus = Math.max(1, Math.min(2, Math.round(p("honeclaws", "focus", action))));
            const window = Math.max(80, Math.round(p("honeclaws", "edge", action)));
            const scrapes = Math.max(8, Math.round(p("honeclaws", "scrapes", action)));
            const before = NativeEffects.effectiveStages(world, actor);
            // 锋口载体拥有这份攻/准贡献：刷新先按 previous 结束同招旧窗口，只续上本招自己那一份。
            const previous = MobEffects.read(world, actor, honeclawsEdge);
            const carrier = MobEffects.apply(world, actor, honeclawsEdge, window, previous ? previous.amplifier() : 0);
            let windowId = 0, gainedRise = 0, gainedFocus = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { atk: rise, accuracy: focus }, carrier.duration(),
                    honeclawsContribution, carrier, previous);
                const raised = NativeEffects.effectiveStages(world, actor);
                gainedRise = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                gainedFocus = Math.max(0, (raised.accuracy || 0) - (before.accuracy || 0));
            }
            const gain = gainedRise + gainedFocus;
            // 上限未增：不留一层空锋口，也不播完整升级，只刮掉表面浮光。
            if (!windowId) MobEffects.consume(world, actor, honeclawsEdge);
            const scale = 1;
            WorldFeedback.emit(world, honeclawsScene, 1, body.position(),
                { moment: "hone", actor: String(actor.ref()), scrapes: scrapes, rise: gainedRise, focus: gainedFocus,
                    gain: gain, shine: gain * 7, full: gain > 0 ? 1 : 0, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, gain / 2 + scrapes / 40)) }, 30);
            if (windowId)
                // 锋口窗口还在的期间，爪尖只留极小亮点；窗口结束或被清除时这条表现随窗口一起收。
                WorldFeedback.onEffect(world, windowId, "world_combat:move_honeclaws/edge", honeclawsScene, 1, body.position(),
                    { moment: "hum", actor: String(actor.ref()), scrapes: Math.max(6, Math.round(scrapes / 3)), scale: scale });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
                gain > 0 ? honeclawsText : honeclawsCappedText, gain > 0 ? [gainedRise, gainedFocus] : [], 30);
            world.sound("cobblemon:move.dragonclaw.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 锋口窗口走完或被清除：等级由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_honeclaws/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== honeclawsEdge) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束，不播散去。
        if (MobEffects.read(world, actor, honeclawsEdge)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, honeclawsScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), honeclawsFadeText, [], 22);
    });
}
