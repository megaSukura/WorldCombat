/**
 * 气味侦测 / odorsleuth 的出手方式。
 *
 * 核心念头：闻着对手的气味把它咬住——在它身上留下一段追踪印记，**幽灵的虚体再次被闻实，一般与格斗打得上**；
 *   气味一直跟着它，让它甩不开脚步。
 *
 * 三幕：
 *   嗅闻（windup，提交前只观察与预告，可被打断，不花代价）。
 *   咬住（提交后）：给目标挂世界效果 world_combat:odorsleuth_mark（共享身份 world_combat:status/foresight、
 *     世界效果身份 world_combat:status/odorsleuth 与伞身份 world_combat:status/identified），一次剥掉它当前的
 *     正闪避、把它照亮；记录层 world_combat:odorsleuth_record 记下剥掉几级、拖慢比例、气味量与窗口。
 *   拖住（存续）：world_combat:navigate 读取这层印记，按 drag 压低目标的移动意图，谁也别想闻着味跑掉。
 *   兑现（任何一般／格斗伤害落在目标身上）：PokemonDamage.metadata 读这层身份把目标属性里的 ghost 摘掉。
 *   自散：窗口走完或被牛奶一类效果解掉时，剥掉的闪避原样还回，气味褪去。
 *
 * 与同族分开：识破最短最便宜、只做一次拔闪避；奇迹之眼改超能对恶的免疫；气味侦测换的是一段长时间的咬住。
 */
namespace PokemonSkills {
    function odorsleuthAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.15, 0)); }

    WorldCombat.effect(odorsleuthRecordEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["taken", "drag", "motes", "window", "reveal"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid odorsleuth record: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(odorsleuthRecordEffect, "start", function () { });
    WorldCombat.effectHandler(odorsleuthRecordEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function odorsleuthRecordOf(world: CombatWorld, target: CombatActor): any {
        const views = world.effects(target, odorsleuthRecordEffect);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function odorsleuthReleaseRecord(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, odorsleuthRecordEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    function odorsleuthStrip(world: CombatWorld, target: CombatActor, request: number): number {
        const current = Math.max(0, NativeEffects.stage(NativeEffects.read(world, target), "evasion"));
        const amount = Math.min(current, Math.max(0, Math.round(request)));
        if (amount > 0) NativeEffects.boost(world, target, "evasion", -amount);
        return amount;
    }

    // 兑现点：任何一般／格斗招式打在带 foresight 身份的目标上时，结算前把 targetFacts 里的 ghost 摘掉。
    PokemonDamage.metadata.define({
        id: "world_combat:move_odorsleuth/negate-immunity",
        applies: function (context) {
            return !context.preview && !!context.world && !!context.target && !!context.targetFacts
                && (context.metadata.type === "normal" || context.metadata.type === "fighting")
                && context.targetFacts.types.indexOf("ghost") >= 0;
        },
        apply: function (context) {
            if (!context.world || !context.target || !context.targetFacts) return;
            if (!CombatStatus.has(context.world, context.target, odorsleuthStatus) && !CombatStatus.has(context.world, context.target, "foresight")) return;
            context.targetFacts.types = context.targetFacts.types.filter(function (type) { return type !== "ghost"; });
        }
    });

    // 气味咬住脚步：被标记期间 AI 的导航速度按 drag 压低。
    WorldCombat.on("world_combat:move_odorsleuth/drag", "world_combat:navigate", "", function (event) {
        const world = event.world(), actor = event.actor();
        if (MobEffects.read(world, actor, odorsleuthMarkEffect) === null) return;
        const record = odorsleuthRecordOf(world, actor);
        const drag = record === null ? 0 : Math.max(0, Math.min(0.8, Number(record.drag) || 0));
        if (drag <= 0) return;
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * (1 - drag));
        event.data(JSON.stringify(data));
    });

    // 窗口走完或被清除：把剥掉的闪避原样还回、清掉记录；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_odorsleuth/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== odorsleuthMarkEffect) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const record = odorsleuthRecordOf(world, target);
        if (record !== null && Number(record.taken) > 0) NativeEffects.boost(world, target, "evasion", Math.round(Number(record.taken)));
        odorsleuthReleaseRecord(world, target);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, odorsleuthScene, 1, body.position(), { moment: "fade", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, odorsleuthAbove(body.position()), odorsleuthFadeText, [], 22);
    });

    // 存续期：每 20 刻续一圈目标身上的气味，数量沿用本招算出的气味量。
    WorldCombat.on("world_combat:move_odorsleuth/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== odorsleuthMarkEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target) || MobEffects.read(world, target, odorsleuthMarkEffect) === null) return;
        const record = odorsleuthRecordOf(world, target);
        if (record === null) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_odorsleuth/hold/" + String(target.ref()), odorsleuthScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), motes: Math.max(8, Math.round(Number(record.motes) / 2)),
                drag: record.drag }, 40);
    });

    define({
        id: odorsleuthId,
        cooldownParameter: "recharge",
        name: "气味侦测",
        description: "闻着对手的气味把它咬住：留下一段追踪印记，剥掉它当下的闪避并把它照亮，幽灵的虚体再次被闻实；被咬住的期间它的脚步被拖慢。",
        uses: ["追一个想跑的幽灵或快手", "长时间把它照亮、别让它藏起来", "替队友的一般或格斗招铺路"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 82,
        style: "scent",
        defaults: { keen: false },
        fields: [flag("keen", "敏锐")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[odorsleuthId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(odorsleuthId, "tempo", context)),
                recover: Math.round(p(odorsleuthId, "aftercast", context)),
                cooldown: Math.round(p(odorsleuthId, "recharge", context)),
                active: 1,
                range: p(odorsleuthId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[odorsleuthId], detail: { values: config } };
            return { radius: p(odorsleuthId, "reach", context), geometry: "line", style: "scent", color: 0xE8D08A,
                label: config && config.keen === true ? "气味侦测 · 敏锐" : "气味侦测" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(odorsleuthId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, odorsleuthStatus) || CombatStatus.has(world, target, "foresight")) return "already-smelled";
            if (CombatStatus.has(world, target, "miracleeye")) return "miracle-eyed";
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_odorsleuth:windup", odorsleuthScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", keen: config && config.keen === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, odorsleuthScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, odorsleuthAbove(action.targetPosition()), odorsleuthEmptyText, [], 24);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, odorsleuthScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, odorsleuthAbove(point), odorsleuthBlockedText, [], 26);
                done(action);
                return;
            }
            const window = Math.max(40, Math.round(p(odorsleuthId, "window", action)));
            const reveal = Math.max(40, Math.round(p(odorsleuthId, "reveal", action)));
            const motes = Math.max(8, Math.round(p(odorsleuthId, "motes", action)));
            const strips = Math.max(0, Math.round(p(odorsleuthId, "strips", action)));
            const drag = Math.max(0, Math.min(0.8, p(odorsleuthId, "drag", action)));
            const taken = odorsleuthStrip(world, target, strips);
            MobEffects.apply(world, target, odorsleuthMarkEffect, window, 0);
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            odorsleuthReleaseRecord(world, target);
            world.effect(odorsleuthRecordEffect, target,
                JSON.stringify({ taken: taken, drag: drag, motes: motes, window: window, reveal: reveal }), window);
            sound(action, "minecraft:entity.warden.sniff");
            if (at !== null) {
                WorldFeedback.emit(world, odorsleuthScene, 1, at.position(),
                    { moment: "pick", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, window: window, drag: drag, taken: taken,
                        scale: Math.max(0.6, Math.min(2, window / 260)), intensity: Math.max(0.7, Math.min(2, 0.7 + drag * 2)) }, 30);
                WorldFeedback.text(world, odorsleuthAbove(at.position()), odorsleuthPickText, [Math.round(window / 20), Math.round(drag * 100)], 30);
                world.sound("minecraft:entity.warden.listening", at.position(), 12, "{}");
            }
            done(action);
        }
    });
}
