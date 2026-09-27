/**
 * 溶化 / acidarmor — 执行组织。
 *
 * 核心念头：身体当场化成一滩会流动的酸——滑开来，从抓住你的东西里挣脱，再重新凝回原形；化开处留下一滩腐蚀的酸。
 *
 * 两幕：
 *   溶（windup 播「溶化」，提交前只观察与预告，打断不花代价）。
 *   流（提交后）：临时防御窗口挂在共享身份 world_combat:status/acidarmor 的
 *     液态窗口（两种形态各自的固定移动加成由本文件 fixedAttributes 提供，按载体固定 10%／20%）；
 *     当场化掉身上的 rooted 与 partiallytrapped／trapped 束缚；
 *     酸池形态在原地留下一滩 world_combat:acid_pool（站进去的非友方中毒），流身形态不留。
 * 结束：液态窗口到期或被清除时，这段防护抬起的等级原样收回、流身的滴液一起收；酸池按自己的时长留在世上。
 */
namespace PokemonSkills {
    const acidarmorScene = "world_combat:move_acidarmor";
    const acidarmorPoolEffect = "world_combat:acidarmor_pool";
    const acidarmorSlickEffect = "world_combat:acidarmor_slick";
    const acidarmorPoolField = "world_combat:acidarmor_pool";
    const acidarmorFlowText = "world_combat.move.acidarmor.text.flow";
    const acidarmorReformText = "world_combat.move.acidarmor.text.reform";
    const acidarmorPoolGlide = "world_combat:acidarmor_pool_glide";
    const acidarmorSlickGlide = "world_combat:acidarmor_slick_glide";
    /** 表现里的参考半径：`data.scale = 实际酸池半径 / 这个数`。 */
    const acidarmorReferenceRadius = 2.0;

    // 酸池：一滩留在原地的腐蚀。站进去的非友方每 20 刻中毒一次（共享身份 poison，宝可梦按属性与特性决定是否免疫）。
    WorldEffects.fieldRule(acidarmorPoolField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const next = field.data.next || (field.data.next = {}), ref = String(actor.ref());
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + 20;
            CombatStatus.inflict(world, actor, "poison");
        }
    });

    /** 流身：真实载体窗口一开就把贴身滴液绑在它上面；载体被清除或到期时画面随之收束。 */
    function acidarmorSlickMark(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null) return;
        let residue = 24;
        try {
            const values = String(actor.domain()) === "cobblemon" ? config(world, actor, "acidarmor") : skills.acidarmor.defaults;
            residue = Math.max(20, Math.round(p("acidarmor", "residue", { world: world, actor: actor, detail: { values: values } })));
        } catch (error) { }
        WorldFeedback.onEffect(world, effect.id(), "acidarmor:slick:" + String(actor.ref()), acidarmorScene, 1,
            body.position(), { moment: "slick", actor: String(actor.ref()), residue: residue, scale: 1 });
    }

    // 固定移速：酸池 +10%／流身 +20%，只按载体存在与否开关，不随防御等级（载体 amplifier）乘算。
    MobEffects.fixedAttributes(acidarmorPoolGlide, acidarmorPoolEffect,
        [{ id: "minecraft:generic.movement_speed", amount: 0.10, operation: "add_multiplied_total" }]);
    MobEffects.fixedAttributes(acidarmorSlickGlide, acidarmorSlickEffect,
        [{ id: "minecraft:generic.movement_speed", amount: 0.20, operation: "add_multiplied_total" }], acidarmorSlickMark);

    /** 换形态：先结束旧形态的固定移速窗口，再移除它的载体，只收回本招这一层；
     *  地面酸池是独立的 world_combat:field，按自己的寿命留在世上。 */
    function acidarmorEndForm(world: CombatWorld, actor: CombatActor, effectId: string, glideId: string): void {
        const windows = world.effects(actor, glideId);
        for (let i = 0; i < windows.length; i++) world.operation(windows[i].id(), "world_combat:dispel", "{}");
        const carrier = MobEffects.read(world, actor, effectId);
        if (carrier) MobEffects.consume(world, actor, effectId);
    }

    /** 液态让身体从束缚里滑脱：化掉身上的 rooted 与共享身份 partiallytrapped／trapped。 */
    function acidarmorSlip(world: CombatWorld, actor: CombatActor): number {
        let freed = 0;
        const roots = world.effects(actor, "world_combat:rooted");
        for (let i = 0; i < roots.length; i++) if (world.operation(roots[i].id(), "world_combat:dispel", "{}")) freed++;
        if (CombatStatus.cure(world, actor, "partiallytrapped")) freed++;
        if (CombatStatus.cure(world, actor, "trapped")) freed++;
        return freed;
    }

    define({
        id: "acidarmor",
        cooldownParameter: "wait",
        name: "溶化",
        description: "提高防御并解除束缚。可选择留下使敌人中毒的酸池，或保持流动形态；液态结束后收回本次防御提升。",
        uses: ["被缠住或钉住时化开脱身", "在对手脚下摊出一滩腐蚀的酸", "用更滑的液态撑过一轮贴身攻击"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 5,
        cooldown: 120,
        style: "ooze",
        stationary: true,
        defaults: { slick: false, ai: { maxChase: 13, panic: 0.6 } },
        fields: [flag("slick", "流身")],
        indicator: function (config, pokemon) {
            return { radius: p("acidarmor", "poolRadius", pokemon), geometry: "area", style: "ooze", color: 0x8FE06A,
                label: config && config.slick === true ? "溶化 · 流身" : "溶化 · 酸池" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["acidarmor"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("acidarmor", "tempo", context)),
                recover: Math.round(p("acidarmor", "aftercast", context)),
                cooldown: Math.round(p("acidarmor", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_acidarmor:melt", acidarmorScene, 1, action.origin(),
                JSON.stringify({ moment: "melt", slick: config && config.slick === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const slick = !!(config && config.slick === true);
            const gift = Math.max(1, Math.min(2, Math.round(p("acidarmor", "gift", action))));
            const window = Math.max(80, Math.round(p("acidarmor", "window", action)));
            const residue = Math.max(12, Math.round(p("acidarmor", "residue", action)));
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const effectId = slick ? acidarmorSlickEffect : acidarmorPoolEffect, contribution = "world_combat:move/acidarmor";
            // 换形态：先结束另一形态自身的载体与属性窗口，本招防御贡献随后原样落到新形态上。
            acidarmorEndForm(world, actor, slick ? acidarmorPoolEffect : acidarmorSlickEffect,
                slick ? acidarmorPoolGlide : acidarmorSlickGlide);
            const before = NativeEffects.effectiveStage(world, actor, "def"), previous = MobEffects.read(world, actor, effectId);
            const carrier = MobEffects.apply(world, actor, effectId, window, previous ? previous.amplifier() : 0);
            let levels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), contribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
                // 载体显示的等级跟着实际防御级数走；移速另由 fixedAttributes 固定，不受这里影响。
                if (carrier.amplifier() !== levels) {
                    const shown = MobEffects.apply(world, actor, effectId, window, levels);
                    if (shown) NativeEffects.boostWindow(world, actor, {}, shown.duration(), contribution, shown, carrier);
                }
            }
            const freed = acidarmorSlip(world, actor);
            let poolRadius = 0, poolTicks = 0, scale = 1;
            if (!slick) {
                poolRadius = Math.max(0.8, p("acidarmor", "poolRadius", action));
                poolTicks = Math.max(80, Math.round(p("acidarmor", "poolTicks", action)));
                scale = poolRadius / acidarmorReferenceRadius;
                const field = WorldEffects.field(world, acidarmorPoolField, feet, poolRadius, {}, poolTicks);
                // 池画面由真实 field 拥有：池开多久画面就留多久，提前收掉或自然到期一起结束。
                if (field > 0) WorldFeedback.onEffect(world, field, "acidarmor:pool:" + String(actor.ref()), acidarmorScene, 1,
                    feet.plus(WorldCombat.point(0, 0.05, 0)),
                    { moment: "pool", actor: String(actor.ref()), poolRadius: poolRadius, residue: residue, scale: scale });
            }
            // 流身的滴液由 startup 载体经 fixedAttributes 窗口拥有，载体清除或到期即停，不再用独立计时。
            WorldFeedback.emit(world, acidarmorScene, 1, feet,
                { moment: "flow", actor: String(actor.ref()), levels: levels, residue: residue, poolRadius: poolRadius,
                    freed: freed, slick: slick ? 1 : 0, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, levels / 2 + residue / 40)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), acidarmorFlowText,
                [levels, Math.round(window / 20)], 32);
            world.sound("minecraft:entity.slime.squish", body.position(), 16, "{}");
            world.sound("minecraft:block.slime_block.place", feet, 14, "{}");
            done(action);
        }
    });

    // 属性随液态窗口结束；移除事件只负责凝回表现。酸池按自己的时长留在世上。
    WorldCombat.on("world_combat:move_acidarmor/reform", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data())), id = String(data.id);
        if (id !== acidarmorPoolEffect && id !== acidarmorSlickEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, id)) return;
        // 换形态时另一形态仍在液态中：不发凝回，由新形态继续。
        if (CombatStatus.has(world, actor, "acidarmor")) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, acidarmorScene, 1, body.position(), { moment: "reform", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), acidarmorReformText, [], 24);
        world.sound("minecraft:block.slime_block.break", body.position(), 12, "{}");
    });
}
