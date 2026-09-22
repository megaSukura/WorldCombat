/**
 * 您先请 / afteryou —— 执行组织。
 *
 * 核心念头：向一个伙伴让出你的节奏——一道引线搭上它，催它紧接着你出手；你把这一拍让出去，自己下一拍要等更久。
 *
 * 三幕：起（windup，提交前）掌心攒起一束先手之光；让（提交后）引线搭上伙伴，
 *   伙伴拿到一段加速窗口（world_combat:skill_haste 临时修饰，冷却按 100/(100+急速) 缩短），
 *   自己背上一段让手减速（负急速）；兑现（伙伴在窗口内第一次出手时浮出「紧接着行动」）；
 *   收（窗口走完／被清除，两边自动收回修饰）。
 *
 * 与同族分开：帮助（helpinghand）加的是下一次命中的伤害，改的是「多重」；您先请不碰伤害，
 *   只把行动节律往伙伴那边挪——伙伴来得更快，自己更慢。
 * 反制：引线要有一条通视直线、伙伴要在够得到的距离内；加速只缩短下一次出手的等待，不改变招式的威力与效果。
 */
namespace PokemonSkills {
    /** 窗口内被兑现的伙伴：第一拍浮字，后续只播速度闪光，不刷屏。 */
    var afteryouSpent: { [ref: string]: boolean } = Object.create(null);

    function afteryouDropEffect(world: CombatWorld, actor: CombatActor, id: string): void {
        const effect = MobEffects.read(world, actor, id);
        if (effect !== null) world.removeMobEffect(actor, id, effect.key());
    }
    function afteryouDropCarrier(world: CombatWorld, actor: CombatActor, id: string): void {
        const views = world.effects(actor, id);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    function afteryouMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, afteryouMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    // 正急速载体：托管效果随自身结束自动收回临时属性修饰；伙伴、原版生物、玩家走同一条原生属性路径。
    WorldCombat.effect(afteryouHaste, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.haste !== "number" || !isFinite(value.haste) || value.haste <= 0) throw new Error("Invalid after you haste");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(afteryouHaste, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), value = JSON.parse(String(effect.state() || "{}"));
        if (!world.valid(actor) || typeof value.haste !== "number") return;
        world.attribute(actor, "world_combat:skill_haste", value.haste, "add_value");
    });
    WorldCombat.effectHandler(afteryouHaste, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 负急速载体：施法者让出的一拍。
    WorldCombat.effect(afteryouDrag, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.drag !== "number" || !isFinite(value.drag) || value.drag <= 0) throw new Error("Invalid after you drag");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(afteryouDrag, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), value = JSON.parse(String(effect.state() || "{}"));
        if (!world.valid(actor) || typeof value.drag !== "number") return;
        world.attribute(actor, "world_combat:skill_haste", -value.drag, "add_value");
    });
    WorldCombat.effectHandler(afteryouDrag, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 画面旁挂：伙伴的加速数与引线光点数。
    WorldCombat.effect(afteryouMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.haste !== "number" || typeof value.motes !== "number" || typeof value.max !== "number") throw new Error("Invalid after you mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(afteryouMark, "start", function () { });
    WorldCombat.effectHandler(afteryouMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 画面旁挂：施法者让手的减速与时限。
    WorldCombat.effect(afteryouCostMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.drag !== "number" || typeof value.max !== "number") throw new Error("Invalid after you cost mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(afteryouCostMark, "start", function () { });
    WorldCombat.effectHandler(afteryouCostMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: afteryouId,
        name: "您先请",
        description: "向一名离得够近、看得见的伙伴让出手先：它获得一段移动与出招都更利落的加速窗口，你自己则背上同样长的一段迟滞；伙伴在窗口内出手时会浮出「紧接着行动」。",
        uses: ["让伙伴抢在自己的拍子前先手出手", "在队友的大招前把节奏让过去", "把一次连招的出手顺序调过来"],
        kind: "friend",
        range: 4,
        maxRange: 12,
        prepare: 7,
        active: 0,
        recover: 5,
        cooldown: 90,
        style: "lead",
        defaults: { lead: 1, ai: { maxChase: 10, leaveStation: false } },
        fields: [
            field(pathOf("lead"), "让手方式", "choice", {
                options: [{ value: 1, label: "催促" }, { value: 0, label: "托付" }],
                help: "催促：加速 ×1.2、窗口 ×0.7，一拍抢得狠但短；托付：加速 ×0.85、窗口 ×1.4，细水长流。用爆发强度换持续时间。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(afteryouId, "reach", pokemon) : 4, geometry: "circle", style: "lead",
                color: 0x8FE06A, label: config && config.lead === 0 ? "您先请·托付" : "您先请·催促" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[afteryouId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(afteryouId, "tempo", context),
                recover: p(afteryouId, "aftercast", context),
                cooldown: p(afteryouId, "recharge", context),
                active: 0,
                range: p(afteryouId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)) return "invalid-target";
            if (String(target.ref()) === String(self.ref())) return "invalid-target";
            const body = world.observe(self), ally = world.observe(target);
            if (body === null || ally === null) return "invalid-target";
            if (ally.position().minus(body.position()).length() > p(afteryouId, "reach", action)) return "out-of-range";
            return world.clear(body.position(), ally.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_afteryou:windup", afteryouScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: target === null ? "" : String(target.ref()),
                    motes: p(afteryouId, "motes", action), lead: config && config.lead === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self), ally = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || ally === null || body === null
                || !world.friendly(target) || String(target.ref()) === String(self.ref())
                || !world.clear(body.position(), ally.position())) { done(action); return; }
            const ticks = Math.max(20, Math.round(p(afteryouId, "readyTicks", action)));
            const haste = Math.max(10, Math.round(p(afteryouId, "haste", action)));
            const yieldTicks = Math.max(20, Math.round(p(afteryouId, "yieldTicks", action)));
            const drag = Math.max(5, Math.round(p(afteryouId, "drag", action)));
            const motes = Math.max(6, Math.round(p(afteryouId, "motes", action)));
            const targetRef = String(target.ref()), selfRef = String(self.ref());
            // 刷新而不是叠加：先收掉伙伴身上旧的加速与自己旧的让手，再挂新的。
            afteryouDropEffect(world, target, afteryouReady);
            afteryouDropCarrier(world, target, afteryouHaste);
            afteryouDropCarrier(world, target, afteryouMark);
            afteryouDropEffect(world, self, afteryouYield);
            afteryouDropCarrier(world, self, afteryouDrag);
            afteryouDropCarrier(world, self, afteryouCostMark);
            delete afteryouSpent[targetRef];
            MobEffects.apply(world, target, afteryouReady, ticks, 0);
            world.effect(afteryouHaste, target, JSON.stringify({ haste: haste }), ticks);
            world.effect(afteryouMark, target, JSON.stringify({ haste: haste, motes: motes, max: ticks, caster: selfRef }), ticks);
            MobEffects.apply(world, self, afteryouYield, yieldTicks, 0);
            world.effect(afteryouDrag, self, JSON.stringify({ drag: drag }), yieldTicks);
            world.effect(afteryouCostMark, self, JSON.stringify({ drag: drag, max: yieldTicks }), yieldTicks);
            WorldFeedback.emit(world, afteryouScene, 1, body.position(),
                { moment: "call", target: targetRef, path: [selfRef, targetRef], motes: motes, haste: haste,
                    scale: Math.max(0.6, Math.min(2, haste / 80)) }, 24);
            WorldFeedback.emit(world, afteryouScene, 1, ally.position(),
                { moment: "ready", target: targetRef, motes: motes, haste: haste, scale: Math.max(0.6, Math.min(2, ticks / 120)) }, 30);
            WorldFeedback.text(world, ally.position().plus(WorldCombat.point(0, 1.15, 0)), afteryouCallText, [Math.round(ticks / 20)], 32);
            sound(action, "minecraft:block.amethyst_block.chime");
            done(action);
        }
    });

    // 兑现：伙伴在窗口内真的出手时，浮出「紧接着行动」——这一拍被用在了哪里，玩家看得到。
    WorldCombat.on("world_combat:move_afteryou/go", "world_combat:committed", "", function (event) {
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || !CombatStatus.has(world, actor, afteryouStatus)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = afteryouMarkOf(world, actor);
        const ref = String(actor.ref()), first = !afteryouSpent[ref];
        afteryouSpent[ref] = true;
        WorldFeedback.emit(world, afteryouScene, 1, body.position(),
            { moment: "go", target: ref, motes: mark ? mark.motes : 10, haste: mark ? mark.haste : 0 }, 24);
        if (first) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), afteryouGoText, [], 28);
    });

    // 窗口走完或被人清除：收掉加速载体与旁挂；到期有一段安静褪去，被清除就直接收回。
    WorldCombat.on("world_combat:move_afteryou/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== afteryouReady) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        afteryouDropCarrier(world, actor, afteryouHaste);
        afteryouDropCarrier(world, actor, afteryouMark);
        delete afteryouSpent[String(actor.ref())];
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, afteryouScene, 1, body.position(),
            { moment: expired ? "fade" : "clear", target: String(actor.ref()), expired: expired ? 1 : 0 }, 22);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), afteryouFadeText, [], 24);
    });

    // 让手结束：收掉施法者背上的减速载体与旁挂，让下一拍正常到来。
    WorldCombat.on("world_combat:move_afteryou/yield", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== afteryouYield) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        afteryouDropCarrier(world, actor, afteryouDrag);
        afteryouDropCarrier(world, actor, afteryouCostMark);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, afteryouScene, 1, body.position(), { moment: "recover", target: String(actor.ref()) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), afteryouYieldText, [], 20);
    });
}
