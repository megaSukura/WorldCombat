/**
 * 心之眼 / mindreader 的出手方式。
 *
 * 核心念头：凝神读穿对手的下一个动作——把自己的准星拉满，**下一次命中因此不会落偏**；读用掉即散。
 *
 * 三幕：
 *   凝神（windup，提交前只观察与预告，可被打断，不花代价）。
 *   读穿（提交后）：给自己挂 world_combat:mindreader_eyes（身份 world_combat:status/mindreader）并把命中等级
 *     拉到满（共享 NativeSemantics.aim 的精度因此满值），同时把目标照亮；标记 world_combat:mindreader_mark
 *     记下实际抬起的等级、读光量与目标。
 *   兑现（下一次伤害命中）：NativeEffects.appliedRules 用掉这层读，把抬起的命中等级原样收回，读光从目标身上散开。
 *   自散：不出手时窗口走完，安静褪去并收回等级（world_combat:mob_effect_removed）。
 *
 * 与同族分开：磨砺只关心自己这一击的要害；锁定把目标钉住；心之眼改的是**施法者自己的准星**，并把对手照亮。
 * 目标若在读还在时退出射程、被清除类效果解掉，或让这一击落空，都拿不到兑现。
 */
namespace PokemonSkills {
    function mindreaderAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    WorldCombat.effect(mindreaderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["added", "motes", "reveal"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid mindreader mark: " + key);
        });
        if (typeof value.target !== "string") throw new Error("Invalid mindreader mark: target");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mindreaderMark, "start", function () { });
    WorldCombat.effectHandler(mindreaderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function mindreaderMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, mindreaderMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function mindreaderReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, mindreaderMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /** 命中等级只有宝可梦有；其他战斗者没有这个概念，返回 0。 */
    function mindreaderRaise(world: CombatWorld, actor: CombatActor, request: number): number {
        if (String(actor.domain()) !== "cobblemon") return 0;
        const before = NativeEffects.stage(NativeEffects.read(world, actor), "accuracy");
        NativeEffects.boost(world, actor, "accuracy", Math.max(0, Math.round(request)));
        return Math.max(0, NativeEffects.stage(NativeEffects.read(world, actor), "accuracy") - before);
    }
    function mindreaderRestore(world: CombatWorld, actor: CombatActor, added: number): void {
        if (added <= 0 || String(actor.domain()) !== "cobblemon") return;
        NativeEffects.boost(world, actor, "accuracy", -added);
    }
    /** 收束这层读：释放标记、原样收回命中等级；自然到期的岔路额外播一次褪去。 */
    function mindreaderClose(world: CombatWorld, actor: CombatActor, cause: string): void {
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        mindreaderReleaseMark(world, actor);
        mindreaderRestore(world, actor, Math.max(0, Math.round(Number(mark.added) || 0)));
        if (cause !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mindreaderScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, mindreaderAbove(body.position()), mindreaderFadeText, [], 22);
    }

    // 兑现点：带读者下一次伤害命中时用掉这层读，收回命中等级，读光从目标身上散开。
    NativeEffects.appliedRules.define({ id: "world_combat:move_mindreader/spend", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.actual > 0)) return;
        if (data.category !== "physical" && data.category !== "special") return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source)) return;
        const mark = mindreaderMarkOf(world, source);
        if (mark === null) return;
        mindreaderReleaseMark(world, source);
        mindreaderRestore(world, source, Math.max(0, Math.round(Number(mark.added) || 0)));
        if (!MobEffects.consumeTagged(world, source, StatusVocabulary.tag(mindreaderStatus)).length) return;
        const victim = world.observe(hit.target);
        const ratio = victim === null ? 0 : Math.max(0, Math.min(1, data.actual / Math.max(1, victim.maxHealth())));
        const motes = Math.max(10, Math.round((mark.motes || 14) * (0.6 + ratio)));
        const sourceBody = world.observe(source);
        if (sourceBody === null) return;
        WorldFeedback.emit(world, mindreaderScene, 1, sourceBody.position(),
            { moment: "strike", target: String(source.ref()), path: [String(source.ref()), String(hit.target.ref())],
                motes: motes, intensity: Math.max(0.6, Math.min(2.2, 0.7 + ratio)) }, 26);
        world.sound("minecraft:entity.player.attack.crit", sourceBody.position(), 14, "{}");
        const victimBody = victim;
        if (victimBody !== null) WorldFeedback.text(world, mindreaderAbove(victimBody.position()), mindreaderReadText, [], 26);
    } });

    // 自散/外解：窗口走到头或被牛奶一类效果解除时，收回命中等级；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_mindreader/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mindreaderEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        mindreaderClose(world, actor, String(data.cause));
    });

    // 存续期：每 20 刻续一条从自己到目标读线，数量沿用本招算出的读光数。
    WorldCombat.on("world_combat:move_mindreader/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mindreaderEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, mindreaderEffect) === null) return;
        const mark = mindreaderMarkOf(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_mindreader/link/" + String(actor.ref()), mindreaderScene, 1, body.position(),
            { moment: "link", target: String(actor.ref()), path: [String(actor.ref()), String(mark.target)],
                motes: Math.max(8, Math.round(Number(mark.motes) || 14) / 2) }, 40);
    });

    define({
        id: mindreaderId,
        cooldownParameter: "recharge",
        name: "心之眼",
        description: "凝神读穿对手的下一个动作：把自己的命中拉满并把对手照亮，让下一次命中不会落偏；读用掉即散。",
        uses: ["在对手要闪开前先把准星拉满", "照亮躲在掩体后的目标", "为一次必须命中的关键攻击做铺垫"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 92,
        style: "read",
        defaults: { predict: false },
        fields: [flag("predict", "预读")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[mindreaderId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(mindreaderId, "tempo", context))),
                recover: Math.round(p(mindreaderId, "aftercast", context)),
                cooldown: Math.round(p(mindreaderId, "recharge", context)),
                active: 1,
                range: p(mindreaderId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(mindreaderId, "reach", pokemon) : 8, geometry: "line", style: "read",
                color: 0xB07CE8, label: config && config.predict ? "心之眼·预读" : "心之眼" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_mindreader:windup", mindreaderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", predict: config && config.predict ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, mindreaderScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, mindreaderScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, mindreaderAbove(point), "world_combat.move.mindreader.text.blocked", [], 28);
                done(action);
                return;
            }
            const ticks = Math.max(60, Math.round(p(mindreaderId, "readTicks", action)));
            const reveal = Math.max(40, Math.round(p(mindreaderId, "reveal", action)));
            const motes = Math.max(8, Math.round(p(mindreaderId, "motes", action)));
            const added = mindreaderRaise(world, actor, p(mindreaderId, "focus", action));
            MobEffects.apply(world, actor, mindreaderEffect, ticks, 0);
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            mindreaderReleaseMark(world, actor);
            world.effect(mindreaderMark, actor, JSON.stringify({ added: added, motes: motes, reveal: reveal, target: String(target.ref()) }), ticks);
            sound(action, "minecraft:block.enchantment_table.use");
            if (self !== null) {
                WorldFeedback.emit(world, mindreaderScene, 1, self.position(),
                    { moment: "read", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, reveal: reveal, added: added, scale: Math.max(0.6, Math.min(2, ticks / 200)) }, 30);
                WorldFeedback.text(world, mindreaderAbove(self.position()), mindreaderReadyText, [added], 30);
            }
            done(action);
        }
    });
}
