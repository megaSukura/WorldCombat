/**
 * 诡计 / nastyplot — 执行组织。
 *
 * 核心念头：把心思全部堆到一个眼前的对手身上——盯着它，一条越来越毒的主意在头顶盘起来，特攻当场抬起来。
 *   它是本族里唯一抬特攻的一招，也是唯一**必须有个算计对象**才算得动的自我强化招。
 *
 * 两幕：
 *   起念（windup 播「盘算」，提交前只观察与预告，打断不花代价）。
 *   成计（提交后）：NativeEffects.boost 把特攻写入公共能力阶梯（scheme 级），挂上共享身份
 *     world_combat:status/nastyplot 的诡计窗口，amplifier 记录这次真正抬起的级数；暗念盘起来并维持一段。
 *
 * 条件：配置「算计活人」开启时，`ready` 在提交前检查面前有没有非友方活体（`nastyPlotFoe`）；没有就拒绝，
 *   不花 PP、不进冷却。关掉「算计活人」则没有这个限制。
 * 结束：窗口走完或被清除时，按 amplifier 把这段诡计抬起的特攻等级原样收回。
 */
namespace PokemonSkills {
    const nastyPlotScene = "world_combat:move_nastyplot";
    const nastyPlotScheme = "world_combat:nasty_plot_scheme";
    const nastyPlotSettleText = "world_combat.move.nastyplot.text.scheme";
    const nastyPlotFadeText = "world_combat.move.nastyplot.text.fade";
    /** 表现里的参考半径：`data.scale = 实际暗念半径 / 这个数`。 */
    const nastyPlotReferenceRadius = 1.4;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function nastyPlotStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function nastyPlotRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = nastyPlotStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, nastyPlotStage(world, actor, stat) - before);
    }
    /** 算计条件：面前 `reach` 格内有没有一个活着的非友方。 */
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
        description: "谋划诡计，激活头脑，大幅提高自己的特攻；这条毒计要有个眼前的对手才算得动。",
        uses: ["开打前盯住一个对手，把特攻垫到最高", "对手藏起来前抢着起念，错过就等下一次照面", "关掉算计活人时，赶路途中闭门先算一档"],
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
        fields: [flag("wary", "算计活人")],
        indicator: function (config, pokemon) {
            return { radius: p("nastyplot", "swirl", pokemon), geometry: "area", style: "scheme", color: 0x6A3FA0,
                label: config && config.wary !== false ? "诡计 · 算计活人" : "诡计 · 闭门算计" };
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
        ready: function (action, config) {
            if (config && config.wary === false) return "";
            return nastyPlotFoe(action.sense(), action.actor(), p("nastyplot", "reach", action)) ? "" : "no-scheme-target";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_nastyplot:plot", nastyPlotScene, 1, action.origin(),
                JSON.stringify({ moment: "plot", wary: config && config.wary !== false ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const wary = !(config && config.wary === false);
            const scheme = Math.max(1, Math.min(2, Math.round(p("nastyplot", "scheme", action))));
            const window = Math.max(100, Math.round(p("nastyplot", "window", action)));
            const swirl = Math.max(0.6, p("nastyplot", "swirl", action));
            const motes = Math.max(12, Math.round(p("nastyplot", "motes", action)));
            const beats = Math.max(2, Math.min(4, Math.round(p("nastyplot", "beats", action))));
            const scale = swirl / nastyPlotReferenceRadius;
            const levels = nastyPlotRaise(world, actor, "spa", scheme);
            MobEffects.apply(world, actor, nastyPlotScheme, window, levels);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, nastyPlotScene, 1, feet,
                { moment: "surge", actor: String(actor.ref()), scheme: levels, motes: motes, beats: beats, scale: scale,
                    wary: wary ? 1 : 0, intensity: Math.max(0.8, Math.min(2, levels / 2 + motes / 60)) }, 34);
            WorldFeedback.keep(world, "nastyplot:scheme:" + String(actor.ref()), nastyPlotScene, 1, body.position(),
                { moment: "sustain", actor: String(actor.ref()), motes: motes, beats: beats, scale: scale }, Math.min(window, 220));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)), nastyPlotSettleText,
                [levels, Math.round(window / 20)], 32);
            world.sound("cobblemon:move.nastyplot.actor_1", body.position(), 16, "{}");
            done(action);
        }
    });

    // 诡计窗口走完或被清除：按 amplifier 把这段诡计抬起的特攻等级原样收回。
    WorldCombat.on("world_combat:move_nastyplot/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== nastyPlotScheme) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(0, Math.round(Number(data.amplifier) || 0));
        const loss = Math.min(levels, Math.max(0, nastyPlotStage(world, actor, "spa")));
        if (loss > 0) NativeEffects.boost(world, actor, "spa", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, nastyPlotScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), nastyPlotFadeText, [], 22);
    });
}
