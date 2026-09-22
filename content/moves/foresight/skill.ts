/**
 * 识破 / foresight 的出手方式。
 *
 * 核心念头：用一眼把对手看穿——在它身上留下一个识破印记，**幽灵的虚体被看实，一般与格斗打得上**；
 *   顺手拔掉它当下的闪避，命中之前没人能躲。印记走完即散。
 *
 * 三幕：
 *   凝目（windup，提交前只观察与预告，可被打断，不花代价）。
 *   看穿（提交后）：给目标挂世界效果 world_combat:foresight_mark（共享身份 world_combat:status/foresight
 *     与 world_combat:status/identified），一次剥掉它当前的正闪避等级，并把它照亮；记录层
 *     world_combat:foresight_record 记下剥掉几级、目光量与窗口。
 *   兑现（任何一般／格斗伤害落在这个目标身上）：PokemonDamage.metadata 在结算前读这层身份，把目标属性里的
 *     ghost 摘掉，这一击因此接得上；结算仍走共享的本系、相性、暴击与特性。
 *   自散：窗口走完或被牛奶一类效果解掉时，剥掉的闪避原样还回，印记褪去。
 *
 * 与同族分开：气味侦测借同一身份但窗口更长、还拖慢脚步；奇迹之眼改超能对恶的免疫。
 */
namespace PokemonSkills {
    function foresightAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.15, 0)); }

    WorldCombat.effect(foresightRecordEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["taken", "motes", "window", "reveal"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid foresight record: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(foresightRecordEffect, "start", function () { });
    WorldCombat.effectHandler(foresightRecordEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function foresightRecordOf(world: CombatWorld, target: CombatActor): any {
        const views = world.effects(target, foresightRecordEffect);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function foresightReleaseRecord(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, foresightRecordEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    /** 拔掉目标当前的正闪避，最多 request 级；返回实际拔掉的级数。其他战斗者没有闪避阶梯，返回 0。 */
    function foresightStrip(world: CombatWorld, target: CombatActor, request: number): number {
        const current = Math.max(0, NativeEffects.stage(NativeEffects.read(world, target), "evasion"));
        const amount = Math.min(current, Math.max(0, Math.round(request)));
        if (amount > 0) NativeEffects.boost(world, target, "evasion", -amount);
        return amount;
    }

    // 兑现点：任何一般／格斗招式打在带识破身份的目标上时，结算前把 targetFacts 里的 ghost 摘掉。
    // 只在这一招建立的身份、且已有命中目标时生效；悬浮预览没有目标，因此不改。
    PokemonDamage.metadata.define({
        id: "world_combat:move_foresight/negate-immunity",
        applies: function (context) {
            return !context.preview && !!context.world && !!context.target && !!context.targetFacts
                && (context.metadata.type === "normal" || context.metadata.type === "fighting")
                && context.targetFacts.types.indexOf("ghost") >= 0;
        },
        apply: function (context) {
            if (!context.world || !context.target || !context.targetFacts) return;
            if (!CombatStatus.has(context.world, context.target, foresightStatus)) return;
            context.targetFacts.types = context.targetFacts.types.filter(function (type) { return type !== "ghost"; });
        }
    });

    // 窗口走完或被清除：把剥掉的闪避原样还回、清掉记录；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_foresight/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== foresightMarkEffect) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const record = foresightRecordOf(world, target);
        if (record !== null && Number(record.taken) > 0) NativeEffects.boost(world, target, "evasion", Math.round(Number(record.taken)));
        foresightReleaseRecord(world, target);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, foresightScene, 1, body.position(), { moment: "fade", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, foresightAbove(body.position()), foresightFadeText, [], 22);
    });

    // 存续期：每 20 刻续一圈目标身上的识破环，数量沿用本招算出的目光量。
    WorldCombat.on("world_combat:move_foresight/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== foresightMarkEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target) || MobEffects.read(world, target, foresightMarkEffect) === null) return;
        const record = foresightRecordOf(world, target);
        if (record === null) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_foresight/hold/" + String(target.ref()), foresightScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), motes: Math.max(8, Math.round(Number(record.motes) / 2)),
                window: record.window, taken: record.taken }, 40);
    });

    define({
        id: foresightId,
        name: "识破",
        description: "用一眼把对手看穿：在它身上留下识破印记，剥掉它当下的闪避并把它照亮，印记里幽灵的虚体被看实，一般与格斗打得上；印记走完即散。",
        uses: ["在打幽灵前先破掉它的免疫", "把躲躲闪闪的目标敲定下来", "替队友的一般或格斗招铺路"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 70,
        style: "foresee",
        defaults: { deep: false },
        fields: [flag("deep", "深识")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[foresightId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(foresightId, "tempo", context)),
                recover: Math.round(p(foresightId, "aftercast", context)),
                cooldown: Math.round(p(foresightId, "recharge", context)),
                active: 1,
                range: p(foresightId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[foresightId], detail: { values: config } };
            return { radius: p(foresightId, "reach", context), geometry: "line", style: "foresee", color: 0xE8F4FF,
                label: config && config.deep === true ? "识破 · 深识" : "识破" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(foresightId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, foresightStatus)) return "already-foreseen";
            if (CombatStatus.has(world, target, "miracleeye")) return "miracle-eyed";
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_foresight:windup", foresightScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, foresightScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, foresightAbove(action.targetPosition()), foresightEmptyText, [], 24);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, foresightScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, foresightAbove(point), foresightBlockedText, [], 26);
                done(action);
                return;
            }
            const window = Math.max(40, Math.round(p(foresightId, "window", action)));
            const reveal = Math.max(40, Math.round(p(foresightId, "reveal", action)));
            const motes = Math.max(8, Math.round(p(foresightId, "motes", action)));
            const strips = Math.max(0, Math.round(p(foresightId, "strips", action)));
            const taken = foresightStrip(world, target, strips);
            MobEffects.apply(world, target, foresightMarkEffect, window, 0);
            MobEffects.apply(world, target, "minecraft:glowing", reveal, 0);
            foresightReleaseRecord(world, target);
            world.effect(foresightRecordEffect, target,
                JSON.stringify({ taken: taken, motes: motes, window: window, reveal: reveal }), window);
            sound(action, "minecraft:block.beacon.power_select");
            if (at !== null) {
                WorldFeedback.emit(world, foresightScene, 1, at.position(),
                    { moment: "read", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, window: window, reveal: reveal, taken: taken, strips: strips,
                        scale: Math.max(0.6, Math.min(2, window / 200)), intensity: Math.max(0.7, Math.min(2, 0.7 + strips / 6)) }, 30);
                WorldFeedback.text(world, foresightAbove(at.position()), foresightSceneText, [Math.round(window / 20)], 30);
                world.sound("minecraft:entity.warden.listening", at.position(), 12, "{}");
            }
            done(action);
        }
    });
}
