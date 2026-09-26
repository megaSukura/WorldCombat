/**
 * 诡计 / nastyplot — 执行组织。
 *
 * 核心念头：把心思盘起来换一段大幅特攻窗口——头顶的想法一点点汇成一个亮点，特攻当场抬起来。
 *   它是本族里唯一只抬特攻的一招：没有必须存在的敌人，开战前、赶路途中都能先算一档；
 *   面前若真有个对手可盯，这条毒计盘得更牢（窗口更长），但那只是加成，不是出手门槛。
 *
 * 两幕：
 *   起念（windup 播「盘算」，提交前只观察与预告，打断不花代价）。
 *   成计（提交后）：空明载体 world_combat:nasty_plot_scheme 拥有一段 boostWindow，
 *     把这次实际抬起的特攻等级挂在共享身份 world_combat:status/nastyplot 的窗口上；
 *     窗口到期、被清除或再次施放刷新时，只撤本招自己这一次贡献的级数，绝不误扣别人的特攻增益。
 *
 * 结束：窗口走完或被清除时，等级由载体窗口自行收回，本单元只在移除事件里收尾表现。
 */
namespace PokemonSkills {
    const nastyPlotScene = "world_combat:move_nastyplot";
    const nastyPlotScheme = "world_combat:nasty_plot_scheme";
    const nastyPlotContribution = "world_combat:move/nastyplot";
    const nastyPlotSettleText = "world_combat.move.nastyplot.text.scheme";
    const nastyPlotCappedText = "world_combat.move.nastyplot.text.capped";
    const nastyPlotFadeText = "world_combat.move.nastyplot.text.fade";
    /** 表现里的参考半径：`data.scale = 实际标识半径 / 这个数`。 */
    const nastyPlotReferenceRadius = 0.5;

    /** 面前 `reach` 格内有没有一个活着的非友方；有就盯着它算，窗口更牢——这只是加成，不是出手前提。 */
    function nastyPlotFoe(world: CombatWorld, actor: CombatActor, reach: number): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const actors = world.query(body.position(), Math.max(0.5, reach), false);
        for (let index = 0; index < actors.length; index++) {
            const facts = world.observe(actors[index]);
            if (facts !== null && facts.health() > 0 && !facts.friendly()) return true;
        }
        return false;
    }

    define({
        id: "nastyplot",
        cooldownParameter: "wait",
        name: "诡计",
        description: "把心思盘起来，头顶的想法汇成一个亮点：特攻大幅提高，并维持一段可见窗口。它没有必须存在的敌人，开战前也能先算；面前若有对手可盯，窗口更长。窗口走完或被清除时，只收回本招抬起的那几级。",
        uses: ["开战前先算一档，把特攻垫到最高", "对手露头、有空档时抢着起念", "赶路途中闭门先算一档备用"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 100,
        style: "scheme",
        stationary: true,
        defaults: { wary: true, ai: { maxChase: 14, minGap: 3 } },
        fields: [flag("wary", "周密算计")],
        indicator: function (config, pokemon) {
            return { radius: p("nastyplot", "swirl", pokemon), geometry: "area", style: "scheme", color: 0x6A3FA0,
                label: config && config.wary !== false ? "诡计 · 周密算计" : "诡计 · 快速算计" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["nastyplot"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("nastyplot", "tempo", context)),
                recover: Math.round(p("nastyplot", "aftercast", context)),
                cooldown: Math.round(p("nastyplot", "wait", context)),
                active: 1,
                range: 1
            };
        },
        // 纯自我整备：没有必须存在的敌人，任何可施法时机都能起念。
        ready: function () { return ""; },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_nastyplot:plot", nastyPlotScene, 1, action.origin(),
                JSON.stringify({ moment: "plot", wary: config && config.wary !== false ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const scheme = Math.max(1, Math.min(2, Math.round(p("nastyplot", "scheme", action))));
            const baseWindow = Math.max(100, Math.round(p("nastyplot", "window", action)));
            const reach = Math.max(0.5, p("nastyplot", "reach", action));
            // 面前有可盯的对手时这条毒计更牢，但没有对手也照样能算。
            const focused = nastyPlotFoe(world, actor, reach);
            const window = Math.max(100, Math.round(baseWindow * (focused ? 1.15 : 1)));
            const swirl = Math.max(0.3, p("nastyplot", "swirl", action));
            const motes = Math.max(12, Math.round(p("nastyplot", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("nastyplot", "beats", action))));
            const scale = swirl / nastyPlotReferenceRadius;
            const before = NativeEffects.effectiveStage(world, actor, "spa");
            // 载体拥有这份特攻贡献：刷新先按 previous 续上本招自己那一份，只撤本招的级数。
            const previous = MobEffects.read(world, actor, nastyPlotScheme);
            let carrier = MobEffects.apply(world, actor, nastyPlotScheme, window, previous ? previous.amplifier() : 0);
            let windowId = 0, levels = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, actor, { spa: scheme }, carrier.duration(),
                    nastyPlotContribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "spa") - before);
                if (carrier.amplifier() !== levels) {
                    const shown = MobEffects.apply(world, actor, nastyPlotScheme, window, levels);
                    if (shown) {
                        const id = NativeEffects.boostWindow(world, actor, {}, shown.duration(), nastyPlotContribution, shown, carrier);
                        if (id) windowId = id;
                        carrier = shown;
                    }
                }
            }
            // 顶到上限时不留一层空窗口，也不播完整升级。
            if (!windowId) MobEffects.consume(world, actor, nastyPlotScheme);
            const head = body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            WorldFeedback.emit(world, nastyPlotScene, 1, body.position(),
                { moment: levels > 0 ? "spark" : "capped", actor: String(actor.ref()), levels: levels,
                    // 只有实际抬到级数才亮：charge 为 0 时亮点一个都不发。
                    charge: levels > 0 ? motes : 0, motes: motes, beats: beats, scale: scale, focused: focused ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) }, 30);
            if (windowId)
                // 窗口还在时头顶只留极轻的标识；窗口到期、被清除或刷新时这条表现随之收。
                WorldFeedback.onEffect(world, windowId, "world_combat:move_nastyplot/mark", nastyPlotScene, 1, head,
                    { moment: "mark", actor: String(actor.ref()), motes: Math.max(6, Math.round(motes / 3)), scale: scale });
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.75 + 0.5, 0)),
                levels > 0 ? nastyPlotSettleText : nastyPlotCappedText, levels > 0 ? [levels, Math.round(window / 20)] : [], 32);
            world.sound("cobblemon:move.nastyplot.actor_1", body.position(), 16, "{}");
            done(action);
        }
    });

    // 诡计窗口走完或被清除：等级由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_nastyplot/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nastyPlotScheme) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束，不播散去。
        if (MobEffects.read(world, actor, nastyPlotScheme)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, nastyPlotScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), nastyPlotFadeText, [], 22);
    });
}
