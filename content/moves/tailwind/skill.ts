/**
 * 顺风 / tailwind — 执行组织。
 *
 * 核心念头：施法者当场搅起一股旋风，风先在脚边收成气旋、再猛地铺开扫过身边的伙伴——整支队伍被同一阵风托住，
 *   比对面先动。风只在此刻托住当时站在圈里的人，之后每个人带着自己的那一阵风离开。
 *
 * 两幕：
 *   起（windup 播「收风」，提交前只观察与预告，打断不花代价）。
 *   托（提交后）：对施法者与半径内的每个友方，先挂上共享身份 world_combat:status/tailwind 的真实 MobEffect
 *     （本单元效果 world_combat:tailwind_gale），再由这份载体拥有一次 NativeEffects.boostWindow 的速度窗口。
 *     申请载体失败、或本轮已到 +6 而没有真实提升，该人就不留身份也不受风，绝不先提速再补一张可能失败的载体。
 * 持续：每个受风者身上的窗口各自拥有一段贴身风线（WorldFeedback.onEffect 绑在窗口上），随窗口到期、被牛奶／
 *   驱散或刷新替换一起收走；不画会让人以为仍在纳人的持续风场。
 * 结束：窗口到期或被清除时由窗口自己按实际贡献收回这一次提速——从当前正等级回扣会把别人的加减速算错。
 */
namespace PokemonSkills {
    const tailwindScene = "world_combat:move_tailwind";
    const tailwindEffect = "world_combat:tailwind_gale";
    const tailwindRideText = "world_combat.move.tailwind.text.ride";
    const tailwindFadeText = "world_combat.move.tailwind.text.fade";
    /** 本招本次风速贡献的窗口身份：到期只撤这一份，其他来源的加减速不动。 */
    const tailwindContribution = "world_combat:move/tailwind";
    /** 表现里的参考半径：`data.scale = 实际风场半径 / 这个数`。 */
    const tailwindReferenceRadius = 6.0;

    /**
     * 把风托到一个人身上：先申请身份载体，再由载体拥有这次提速。
     * 已经带着同一身份、或本轮抬不动的战斗者不重复托；申请失败时不留只能显示的空身份。
     */
    function tailwindCatch(world: CombatWorld, actor: CombatActor, gift: number, ticks: number,
        radius: number, streaks: number, motes: number, lead: boolean): boolean {
        if (MobEffects.read(world, actor, tailwindEffect) !== null) return false;
        const before = NativeEffects.effectiveStage(world, actor, "spe");
        if (before >= 6) return false;
        const body = world.observe(actor);
        if (body === null) return false;
        const scale = radius / tailwindReferenceRadius;
        const carrier = MobEffects.apply(world, actor, tailwindEffect, ticks, 0);
        if (carrier === null) return false;
        const owned = NativeEffects.boostWindow(world, actor, { spe: gift }, carrier.duration(),
            tailwindContribution, carrier, null);
        const gained = Math.max(0, NativeEffects.effectiveStage(world, actor, "spe") - before);
        if (!owned || gained <= 0) {
            if (owned) NativeEffects.windowClose(world, owned);
            MobEffects.consume(world, actor, tailwindEffect);
            return false;
        }
        WorldFeedback.emit(world, tailwindScene, 1, body.position(),
            { moment: "catch", target: String(actor.ref()), streaks: streaks, motes: motes, gift: gained,
                scale: scale, intensity: Math.max(0.7, Math.min(2, gained / 2 + 0.3)) }, 26);
        // 贴身风线由这次真实窗口拥有：窗口一收，表现随之收，不额外留定时器。
        WorldFeedback.onEffect(world, owned, "tailwind:" + (lead ? "lead:" : "streak:") + String(actor.ref()),
            tailwindScene, 1, body.position(),
            { moment: lead ? "ride" : "streaks", target: String(actor.ref()), streaks: streaks, motes: motes, scale: scale });
        return true;
    }

    /** 给施法者与半径内友方一起托风；返回这次风托住的人数。 */
    function tailwindSweep(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        gift: number, streaks: number, motes: number): number {
        let reached = 0;
        if (tailwindCatch(world, caster, gift, ticks, radius, streaks, motes, true)) reached++;
        const body = world.observe(caster);
        if (body === null) return reached;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (world.observe(other) === null) continue;
            if (tailwindCatch(world, other, gift, ticks, radius, streaks, motes, false)) reached++;
        }
        return reached;
    }

    define({
        id: "tailwind",
        cooldownParameter: "wait",
        name: "顺风",
        description: "提高自身和附近队友的速度；效果结束后收回本次提升。",
        uses: ["开打前把整队的速度垫起来", "在被追上之前让全队先动起来", "把队友连成一队一起压上去", "独自追击或撤离时也能只给自己起一阵风"],
        kind: "self",
        range: 6,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gale",
        stationary: true,
        defaults: { gale: 1, ai: { maxChase: 9, minGap: 3 } },
        fields: [
            field(pathOf("gale"), "风向", "choice", {
                options: [
                    { value: 1, label: "广风" },
                    { value: 0, label: "长风" }
                ],
                help: "广风：半径 ×1.25、风点 ×1.1，但窗口 ×0.8，铺得开、停得早；长风：窗口 ×1.35，但半径 ×0.85、风点 ×0.9，罩得紧、撑得久。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("tailwind", "reach", pokemon) : 6, geometry: "area", style: "gale", color: 0xBEE9F2,
                label: config && Number(config.gale) === 1 ? "顺风 · 广风" : "顺风 · 长风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tailwind"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tailwind", "tempo", context)),
                recover: Math.round(p("tailwind", "aftercast", context)),
                cooldown: Math.round(p("tailwind", "wait", context)),
                active: 1,
                range: p("tailwind", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tailwind:gather", tailwindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", gale: config && Number(config.gale) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(2, Math.min(3, Math.round(p("tailwind", "gift", action))));
            const window = Math.max(120, Math.round(p("tailwind", "window", action)));
            const radius = Math.max(1.5, p("tailwind", "reach", action));
            const motes = Math.max(16, Math.round(p("tailwind", "motes", action)));
            const streaks = Math.max(4, Math.round(p("tailwind", "streaks", action)));
            const scale = radius / tailwindReferenceRadius;
            const reached = tailwindSweep(world, actor, radius, window, gift, streaks, motes);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, tailwindScene, 1, feet,
                { moment: "burst", target: String(actor.ref()), gift: gift, radius: radius, motes: motes, streaks: streaks,
                    scale: scale, intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.4)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), tailwindRideText,
                [gift, reached, Math.round(window / 20)], 34);
            world.sound("cobblemon:move.gust.actor", body.position(), 16, "{}");
            world.sound("minecraft:entity.breeze.whirl", body.position(), 14, "{}");
            done(action);
        }
    });

    // 风停：风速窗口已经自行收回，这里只按每个受风者播一次贴身收束。
    WorldCombat.on("world_combat:move_tailwind/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailwindEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束。
        if (MobEffects.read(world, actor, tailwindEffect) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tailwindScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), tailwindFadeText, [], 24);
    });
}
