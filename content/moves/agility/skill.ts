/**
 * 高速移动 / agility — 执行组织。
 *
 * 核心念头：把全身的力一下子卸掉，身体变轻，脚下一圈风先收再炸——你比周围先动了一拍。
 *
 * 一幕半：
 *   松（windup 播「聚风」，提交前只观察与预告，打断不花代价）。
 *   弹（提交后）：NativeEffects.boost(spe, requested) 立刻写入公共能力阶梯，按前后有效等级差取**真实涨级**回执
 *     （封顶时为 0，不虚报）；挂上共享身份 world_combat:status/agility 的「轻身」窗口，播放一次向外的风爆与地环。
 *     窗口内的残影拖尾由这次 carrier 拥有的托管 mark 承载：净化／到期随 carrier 一起收，重施替换旧窗口与旧 mark。
 * 反制：起手极短但仍在提交前，抢一次打断能白赚；重施受冷却与轻身窗口限制，不会空烧 PP。
 */
namespace PokemonSkills {
    const agilityScene = "world_combat:move_agility";
    const agilityRush = "world_combat:agility_rush";
    const agilityWake = "world_combat:agility_wake";
    const agilityText = "world_combat.move.agility.text.rush";
    const agilityCappedText = "world_combat.move.agility.text.capped";
    /** 表现里的参考半径：`data.scale = 实际风爆半径 / 这个数`，让地环与判定同半径。 */
    const agilityReferenceRadius = 0.9;

    // 轻身余韵只活在这一次 carrier 还在的时候：残影拖尾挂在 mark 上，净化/到期随 carrier 一起收，
    // 重施先替换旧窗口与旧 mark，不叠第二份，也不留失效锚。
    WorldCombat.effect(agilityWake, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid agility wake: anchor");
        if (typeof value.motes !== "number" || !isFinite(value.motes) || value.motes <= 0) throw new Error("Invalid agility wake: motes");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(agilityWake, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) effect.end();
    });
    WorldCombat.effectHandler(agilityWake, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 轻身一被清除（牛奶、/effect clear、自然到期或替换），这次 mark 就地结束、残影立即停。
    WorldCombat.on("world_combat:move_agility/light-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== agilityRush) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, agilityRush) !== null) return;
        world.effects(actor, agilityWake).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: "agility",
        cooldownParameter: "wait",
        name: "高速移动",
        description: "大幅提高速度等级，并留下一段「轻身」余韵。",
        uses: ["开场先松劲，把速度垫起来", "在被追上之前抢先拉开", "在连打之间随手补一档速度"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 60,
        style: "gust",
        defaults: { ai: { maxChase: 14, minGap: 3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("agility", "surge", pokemon), geometry: "area", style: "gust", color: 0x8FE3F5,
                label: "高速移动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["agility"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("agility", "tempo", context)),
                recover: Math.round(p("agility", "aftercast", context)),
                cooldown: Math.round(p("agility", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_agility:gather", agilityScene, 1, action.origin(),
                JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const requested = Math.max(2, Math.min(3, Math.round(p("agility", "gift", action))));
            const surge = Math.max(0.7, p("agility", "surge", action));
            const motes = Math.max(16, Math.round(p("agility", "motes", action)));
            const window = Math.max(60, Math.round(p("agility", "rushTicks", action)));
            const scale = surge / agilityReferenceRadius;
            const before = NativeEffects.effectiveStage(world, actor, "spe");
            // 重施先替换旧窗口与旧 mark，不叠第二份；真实涨级取前后有效等级差（封顶时可能为 0，不虚报）。
            world.effects(actor, agilityWake).forEach(function (view) {
                world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const carrier = MobEffects.set(world, actor, agilityRush, window, 0);
            NativeEffects.boost(world, actor, "spe", requested);
            const actual = Math.max(0, NativeEffects.effectiveStage(world, actor, "spe") - before);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            if (carrier) {
                const mark = world.effect(agilityWake, actor,
                    JSON.stringify({ anchor: MobEffects.anchor(carrier), motes: motes, scale: scale }), window);
                if (mark > 0) WorldFeedback.onEffect(world, mark, "agility:wake:" + String(actor.ref()), agilityScene, 1,
                    body.position(), { moment: "wake", actor: String(actor.ref()), motes: motes, scale: scale });
            }
            WorldFeedback.emit(world, agilityScene, 1, feet,
                { moment: "burst", actor: String(actor.ref()), gift: actual, surge: surge, motes: motes, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, actual / 2 + 0.4)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                actual > 0 ? agilityText : agilityCappedText, actual > 0 ? [actual] : [], 30);
            world.sound("cobblemon:move.quickattack.actor", body.position(), 16, "{}");
            done(action);
        }
    });
}
