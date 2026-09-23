/**
 * 溶化 / acidarmor — 执行组织。
 *
 * 核心念头：身体当场化成一滩会流动的酸——滑开来，从抓住你的东西里挣脱，再重新凝回原形；化开处留下一滩腐蚀的酸。
 *
 * 两幕：
 *   溶（windup 播「溶化」，提交前只观察与预告，打断不花代价）。
 *   流（提交后）：临时防御窗口挂在共享身份 world_combat:status/acidarmor 的
 *     液态窗口（两种形态各自的移动加成见 startup.ts）；当场化掉身上的 rooted 与 partiallytrapped／trapped 束缚；
 *     酸池形态在原地留下一滩 world_combat:acid_pool（站进去的非友方中毒），流身形态不留。
 * 结束：液态窗口到期或被清除时，这段防护抬起的等级原样收回；酸池按自己的时长留在世上。
 */
namespace PokemonSkills {
    const acidarmorScene = "world_combat:move_acidarmor";
    const acidarmorPoolEffect = "world_combat:acidarmor_pool";
    const acidarmorSlickEffect = "world_combat:acidarmor_slick";
    const acidarmorPoolField = "world_combat:acidarmor_pool";
    const acidarmorFlowText = "world_combat.move.acidarmor.text.flow";
    const acidarmorReformText = "world_combat.move.acidarmor.text.reform";
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
        description: "通过细胞的变化进行液化，从而大幅提高自己的防御。",
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
            const before = NativeEffects.effectiveStage(world, actor, "def"), previous = MobEffects.read(world, actor, effectId);
            const carrier = MobEffects.apply(world, actor, effectId, window, previous ? previous.amplifier() : 0);
            let levels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), contribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
                // Preserve the native amplifier used by this form's movement attribute.
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
                WorldEffects.field(world, acidarmorPoolField, feet, poolRadius, {}, poolTicks);
                WorldFeedback.keep(world, "acidarmor:pool:" + String(actor.ref()), acidarmorScene, 1,
                    feet.plus(WorldCombat.point(0, 0.05, 0)),
                    { moment: "pool", actor: String(actor.ref()), poolRadius: poolRadius, residue: residue, scale: scale },
                    Math.min(poolTicks, 220));
            } else {
                WorldFeedback.keep(world, "acidarmor:slick:" + String(actor.ref()), acidarmorScene, 1, body.position(),
                    { moment: "slick", actor: String(actor.ref()), residue: residue, scale: scale }, Math.min(window, 220));
            }
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
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, acidarmorScene, 1, body.position(), { moment: "reform", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), acidarmorReformText, [], 24);
        world.sound("minecraft:block.slime_block.break", body.position(), 12, "{}");
    });
}
