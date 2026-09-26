/**
 * 奇迹之眼 / miracleeye 的出手方式。
 *
 * 核心念头：凝起一只心眼穿透恶的屏障——在对手身上留下心眼印记，**超能招式不再被恶属性免疫**；借这一眼，
 *   自己的准星也更稳。两端分开：目标端是印记与闪避，施法者端是自己抬的命中，各自到期、各自褪去。
 *
 * 三幕：
 *   凝神（windup，提交前只观察与预告，可被打断，不花代价）。
 *   看穿（提交后）：目标端挂 world_combat:miracleeye_mark（共享身份 world_combat:status/miracleeye 与伞身份
 *     world_combat:status/identified），一次剥掉它当前的正闪避、把它照亮；记录层 world_combat:miracleeye_record
 *     记下剥掉几级与窗口，并绑定目标环表现。施法者端挂 world_combat:miracleeye_focus，用 NativeEffects.boostWindow
 *     把命中抬 insight 级，绑定到这条真实 MobEffect 上，在自己的窗口里到期。
 *   兑现（任何超能伤害落在目标身上）：PokemonDamage.metadata 在结算前读这层身份，把目标属性里的 dark 摘掉。
 *   自散：目标端窗口走完或被牛奶一类效果解掉时，剥掉的闪避原样还回；施法者端的命中在自己的窗口到期时原样收回。
 *     任一端结束只 fading 自己那一端。
 *
 * 与同族分开：识破／气味侦测破的是幽灵对一般／格斗的免疫，奇迹之眼破的是恶对超能的免疫，还额外抬施法者命中。
 *   两者各自叠加／清理，不再互相拒绝；同一份正闪避上下一次前先还回上一份，不重复扣还放大。
 */
namespace PokemonSkills {
    function miracleeyeAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.15, 0)); }

    WorldCombat.effect(miracleeyeRecordEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["taken", "added", "motes", "window", "reveal"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid miracleeye record: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 目标环绑到记录层这条托管效果上，记录层结束即一起收。
    WorldCombat.effectHandler(miracleeyeRecordEffect, "start", function (effect) {
        const world = effect.world(), target = effect.target();
        const data = JSON.parse(effect.state());
        const body = world.observe(target);
        if (body !== null) WorldFeedback.onEffect(world, effect.id(), "hold", miracleeyeScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), motes: Math.max(8, Math.round(Number(data.motes) / 2)), added: data.added });
    });
    WorldCombat.effectHandler(miracleeyeRecordEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function miracleeyeRecordOf(world: CombatWorld, target: CombatActor): any {
        const views = world.effects(target, miracleeyeRecordEffect);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function miracleeyeReleaseRecord(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, miracleeyeRecordEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    /** 结算目标端旧记录：把它剥掉的闪避原样还回再释放，避免第二次看穿在同一份闪避上反复扣还放大。 */
    function miracleeyeSettleRecord(world: CombatWorld, target: CombatActor): void {
        const record = miracleeyeRecordOf(world, target);
        if (record !== null && Number(record.taken) > 0) NativeEffects.boost(world, target, "evasion", Math.round(Number(record.taken)));
        miracleeyeReleaseRecord(world, target);
    }
    function miracleeyeStrip(world: CombatWorld, target: CombatActor, request: number): number {
        const current = Math.max(0, NativeEffects.stage(NativeEffects.read(world, target), "evasion"));
        const amount = Math.min(current, Math.max(0, Math.round(request)));
        if (amount > 0) NativeEffects.boost(world, target, "evasion", -amount);
        return amount;
    }
    /** 施法者端命中：把命中等级做成绑定到真实 MobEffect 的临时窗口；返回实际抬起的级数。 */
    function miracleeyeOpenEye(world: CombatWorld, actor: CombatActor, request: number, ticks: number, motes: number): number {
        const before = NativeEffects.effectiveStage(world, actor, "accuracy");
        const carrier = MobEffects.apply(world, actor, miracleeyeFocusEffect, ticks, 0);
        if (carrier === null) return 0;
        const layer = NativeEffects.boostWindow(world, actor, { accuracy: Math.max(0, Math.round(request)) }, ticks, "miracleeye", carrier);
        const gained = Math.max(0, NativeEffects.effectiveStage(world, actor, "accuracy") - before);
        const body = world.observe(actor);
        if (body !== null) {
            WorldFeedback.emit(world, miracleeyeScene, 1, body.position(),
                { moment: "focus", target: String(actor.ref()), added: gained, window: ticks, motes: motes }, 24);
            if (layer) WorldFeedback.onEffect(world, layer, "focus-hold", miracleeyeScene, 1, body.position(),
                { moment: "focus_hold", target: String(actor.ref()), added: gained });
        }
        return gained;
    }

    // 兑现点：任何超能招式打在带 miracleeye 身份的目标上时，结算前把 targetFacts 里的 dark 摘掉。
    PokemonDamage.metadata.define({
        id: "world_combat:move_miracleeye/negate-immunity",
        applies: function (context) {
            return !context.preview && !!context.world && !!context.target && !!context.targetFacts
                && context.metadata.type === "psychic" && context.targetFacts.types.indexOf("dark") >= 0;
        },
        apply: function (context) {
            if (!context.world || !context.target || !context.targetFacts) return;
            if (!CombatStatus.has(context.world, context.target, miracleeyeStatus)) return;
            context.targetFacts.types = context.targetFacts.types.filter(function (type) { return type !== "dark"; });
        }
    });

    // 目标端窗口走完或被清除：把剥掉的闪避还回目标、清掉记录；自然到期额外播一次褪去。施法者端的命中不在
    // 这里动，它随自己的 focus 效果到期。
    WorldCombat.on("world_combat:move_miracleeye/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== miracleeyeMarkEffect) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const record = miracleeyeRecordOf(world, target);
        if (record !== null && Number(record.taken) > 0) NativeEffects.boost(world, target, "evasion", Math.round(Number(record.taken)));
        miracleeyeReleaseRecord(world, target);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, miracleeyeScene, 1, body.position(), { moment: "fade", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, miracleeyeAbove(body.position()), miracleeyeFadeText, [], 22);
    });

    // 施法者端窗口走完或被清除：自己那一端单独 fade。
    WorldCombat.on("world_combat:move_miracleeye/focus-end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== miracleeyeFocusEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, miracleeyeScene, 1, body.position(), { moment: "focus_end", target: String(actor.ref()) }, 20);
        WorldFeedback.text(world, miracleeyeAbove(body.position()), miracleeyeFocusEndText, [], 20);
    });

    define({
        id: miracleeyeId,
        cooldownParameter: "recharge",
        name: "奇迹之眼",
        description: "凝起一只心眼穿透对手的屏障：留下心眼印记，剥掉它当下的闪避并把它照亮，超能招式不再被恶属性免疫；借这一眼自己也抬命中，两端各自到期。",
        uses: ["在打恶属性前先破掉它的免疫", "把躲躲闪闪的目标敲定下来", "顺手给自己的超能招抬一抬命中"],
        kind: "aim",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 90,
        style: "insight",
        defaults: { focus: false },
        fields: [flag("focus", "专注")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[miracleeyeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(miracleeyeId, "tempo", context)),
                recover: Math.round(p(miracleeyeId, "aftercast", context)),
                cooldown: Math.round(p(miracleeyeId, "recharge", context)),
                active: 1,
                range: p(miracleeyeId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[miracleeyeId], detail: { values: config } };
            return { radius: p(miracleeyeId, "reach", context), geometry: "line", style: "insight", color: 0xB07CE8,
                label: config && config.focus === true ? "奇迹之眼 · 专注" : "奇迹之眼" };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (MobEffects.read(world, actor, miracleeyeFocusEffect) !== null) return "already-reading";
            if (target === null) return "";              // 空点：只给自己开眼
            if (!world.valid(target)) return "invalid-target";
            if (world.friendly(target)) return "";       // 友方：不虚挂敌印记，只自专注
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(miracleeyeId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, miracleeyeStatus)) return "already-read";
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_miracleeye:windup", miracleeyeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const window = Math.max(40, Math.round(p(miracleeyeId, "window", action)));
            const reveal = Math.max(40, Math.round(p(miracleeyeId, "reveal", action)));
            const selfWindow = Math.max(40, Math.round(p(miracleeyeId, "insightWindow", action)));
            const motes = Math.max(8, Math.round(p(miracleeyeId, "motes", action)));
            const strips = Math.max(0, Math.round(p(miracleeyeId, "strips", action)));
            /** 自己这一端：只要还没有开着眼，就抬命中；和目标端各走各的时钟。 */
            function openFocus(): number {
                if (MobEffects.read(world, actor, miracleeyeFocusEffect) !== null) return 0;
                return miracleeyeOpenEye(world, actor, p(miracleeyeId, "insight", action), selfWindow, motes);
            }

            const enemy = target !== null && world.valid(target) && !world.friendly(target);
            const at = enemy ? world.observe(target) : null;
            if (!enemy || at === null) {
                // 空点／友方：只自专注，不虚挂敌印记；照付同样的 PP 与冷却。
                const gained = openFocus();
                sound(action, "cobblemon:move.psychic.actor");
                WorldFeedback.text(world, miracleeyeAbove(action.targetPosition()), miracleeyeFocusText, [gained, Math.round(selfWindow / 20)], 28);
                done(action);
                return;
            }
            const point = at.position();
            // 视线被挡或距离不够，整次读失败，不给自己开眼。
            if (point.minus(origin).length() > p(miracleeyeId, "reach", action) || !world.clear(origin, point)) {
                WorldFeedback.emit(world, miracleeyeScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, miracleeyeAbove(point), miracleeyeBlockedText, [], 26);
                done(action);
                return;
            }
            if (CombatStatus.has(world, target, miracleeyeStatus)) {
                WorldFeedback.emit(world, miracleeyeScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 16);
                WorldFeedback.text(world, miracleeyeAbove(point), miracleeyeEmptyText, [], 24);
                done(action);
                return;
            }
            const gained = openFocus();
            sound(action, "cobblemon:move.psychic.actor");
            miracleeyeSettleRecord(world, target);
            const taken = miracleeyeStrip(world, target, strips);
            MobEffects.apply(world, target, miracleeyeMarkEffect, window, 0);
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            world.effect(miracleeyeRecordEffect, target,
                JSON.stringify({ taken: taken, added: gained, motes: motes, window: window, reveal: reveal }), window);
            WorldFeedback.emit(world, miracleeyeScene, 1, point,
                { moment: "read", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    motes: motes, window: window, reveal: reveal, added: gained, taken: taken,
                    scale: Math.max(0.6, Math.min(2, window / 220)), intensity: Math.max(0.7, Math.min(2, 0.7 + gained / 3)) }, 30);
            WorldFeedback.text(world, miracleeyeAbove(point), miracleeyeReadText, [gained, Math.round(window / 20)], 30);
            world.sound("cobblemon:move.psychic.target", point, 12, "{}");
            done(action);
        }
    });
}
