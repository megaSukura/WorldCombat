/**
 * 牵手 / Hold Hands —— 执行组织。
 *
 * 核心念头：两只宝可梦拉起手来。一条暖色的链子连着他们；只要链子还在，两个人每隔一小段就从彼此那里
 *   匀回一点体力。链子有长度——走远了连接就断，两端同时失去这份幸福。
 *
 * 出手：短起手（windup 在手上聚起心光），提交后先解除双方各自已有的牵手关系，再给双方挂共享身份
 *   world_combat:status/holdhands（本单元效果 world_combat:hand_in_hand），并以施法者为宿主起连接效果
 *   world_combat:holdhands_link。连接数据记下两端本次 carrier 的修订，清理只撤本次认下的那一对。
 * 持续：连接每 healInterval 刻检查一次——两人都在链子长度内、两端的 carrier 修订都还在，就各按自身最大生命回复 healShare，
 *   同时把连接画面沿两人之间续上；任何一边离开范围、被清掉状态或被替换，连接立刻断开。
 * 结束：连接走完或被断开时，收回本次两端的状态，链子安静散去（正常到点）或当场崩断（拉开距离）。
 * 反制：这是一条站位约定——把其中一人击退或换位、或用清除类效果解掉身份，都能让疗伤提前结束。
 */
namespace PokemonSkills {
    function holdhandsAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /**
     * 每人只留一条有效关系：解除 actor 作为施法者的链，也解除以 actor 为伙伴的链。
     * 每条链的 end 只按自己记下的修订撤自己那一对，不会误清后来者。
     */
    function holdhandsBreak(world: CombatWorld, actor: CombatActor): void {
        const ref = String(actor.ref());
        const own = world.effects(actor, holdhandsLink);
        for (let index = 0; index < own.length; index++) world.operation(own[index].id(), "world_combat:dispel", "{}");
        const links = world.effectsOfType(holdhandsLink);
        for (let index = 0; index < links.length; index++) {
            let data: any;
            try { data = JSON.parse(String(links[index].data())); } catch (error) { continue; }
            if (String(data.partner) === ref) world.operation(links[index].id(), "world_combat:dispel", "{}");
        }
    }

    WorldCombat.effect(holdhandsLink, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.partner !== "string") throw new Error("Invalid holdhands link: partner");
        ["radius", "share", "interval", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid holdhands link: " + key);
        });
        if (!MobEffects.validAnchor(value.selfAnchor) || !MobEffects.validAnchor(value.partnerAnchor))
            throw new Error("Invalid holdhands link: anchors");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(holdhandsLink, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(holdhandsLink, "pulse", function (effect) {
        const world = effect.world(), caster = effect.target();
        const data = JSON.parse(effect.state());
        const partner = world.actor(data.partner);
        const body = world.observe(caster), mate = partner === null ? null : world.observe(partner);
        if (body === null || partner === null || mate === null || !world.valid(partner)) { effect.end(); return; }
        // 任一端本次 carrier 被替换或清除，关系就断开；绝不让失效的锚继续挂另一方回血。
        if (!MobEffects.matches(world, caster, data.selfAnchor)
            || !MobEffects.matches(world, partner, data.partnerAnchor)) { effect.end(); return; }
        const scale = Math.max(0.6, Math.min(2, Number(data.radius) / 4.5));
        if (body.position().minus(mate.position()).length() > Number(data.radius)) {
            data.reason = "snap";
            effect.state(JSON.stringify(data));
            effect.end();
            return;
        }
        const share = Math.max(0.005, Math.min(0.08, Number(data.share)));
        heal(world, caster, share, "holdhands");
        if (world.observe(partner) !== null) heal(world, partner, share, "holdhands");
        const after = world.observe(caster), mateNow = world.observe(partner);
        if (after === null || mateNow === null) { effect.end(); return; }
        // 连接画面与持续心光都绑在这次连接效果上：连接一断，表现一起收，不靠独立 keep 残留。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_holdhands/warm", holdhandsScene, 1, mateNow.position(),
            { moment: "warm", path: [String(caster.ref()), String(partner.ref())], target: String(partner.ref()),
                motes: data.motes, scale: scale });
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_holdhands/heart-self", holdhandsScene, 1, after.position(),
            { moment: "mark", target: String(caster.ref()) });
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_holdhands/heart-partner", holdhandsScene, 1, mateNow.position(),
            { moment: "mark", target: String(partner.ref()) });
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(Number(data.interval))), "{}");
    });
    WorldCombat.effectHandler(holdhandsLink, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(holdhandsLink, "end", function (effect) {
        const world = effect.world(), caster = effect.target(), data = JSON.parse(effect.state());
        // 只撤本次认下的 carrier：修订不一致说明它已被换人或已消失，交给新主人。
        if (world.valid(caster) && MobEffects.matches(world, caster, data.selfAnchor)) MobEffects.consume(world, caster, holdhandsEffect);
        const partner = world.actor(data.partner);
        if (partner !== null && world.valid(partner) && MobEffects.matches(world, partner, data.partnerAnchor))
            MobEffects.consume(world, partner, holdhandsEffect);
        const snap = data.reason === "snap", scale = Math.max(0.6, Math.min(2, Number(data.radius) / 4.5));
        const body = world.observe(caster);
        if (body !== null) {
            WorldFeedback.emit(world, holdhandsScene, 1, body.position(),
                { moment: snap ? "snap" : "fade", target: String(caster.ref()), motes: data.motes, scale: scale }, 24);
            WorldFeedback.text(world, holdhandsAbove(body.position()), snap ? holdhandsSnapText : holdhandsFadeText, [], 22);
        }
        if (partner !== null && world.valid(partner)) {
            const mate = world.observe(partner);
            if (mate !== null) WorldFeedback.emit(world, holdhandsScene, 1, mate.position(),
                { moment: snap ? "snap" : "fade", target: String(partner.ref()), motes: data.motes, scale: scale }, 24);
        }
    });

    // 任一端的状态被外力清除（牛奶／/effect clear 等）时，立刻收掉两端自身修订不再匹配的链。
    WorldCombat.on("world_combat:move_holdhands/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== holdhandsEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref());
        const own = world.effects(actor, holdhandsLink);
        for (let index = 0; index < own.length; index++) {
            const state = JSON.parse(String(own[index].data()));
            if (!MobEffects.matches(world, actor, state.selfAnchor)) world.operation(own[index].id(), "world_combat:dispel", "{}");
        }
        const links = world.effectsOfType(holdhandsLink);
        for (let index = 0; index < links.length; index++) {
            const state = JSON.parse(String(links[index].data()));
            if (String(state.partner) !== ref) continue;
            if (!MobEffects.matches(world, actor, state.partnerAnchor)) world.operation(links[index].id(), "world_combat:dispel", "{}");
        }
    });

    define({
        id: holdhandsId,
        cooldownParameter: "recharge", name: "牵手",
        description: "和伙伴拉起手：一条暖色的链子连着你们，只要链子还在，双方每隔一小段就匀回一点体力；走远了连接会断，两端同时失去这份幸福。",
        uses: ["让两只宝可梦贴着一起回血", "用站位约束换一段持续疗伤", "在喘息间隙把两名成员一起补起来"],
        kind: "friend", range: 3, maxRange: 5,
        prepare: 6, active: 0, recover: 6, cooldown: 60, style: "hold",
        defaults: { tight: false },
        fields: [flag("tight", "紧握")],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[holdhandsId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.max(3, Math.round(p(holdhandsId, "tempo", context))),
                recover: Math.round(p(holdhandsId, "aftercast", context)),
                cooldown: Math.round(p(holdhandsId, "recharge", context)),
                active: 0, range: p(holdhandsId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null || String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            return "";
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(holdhandsId, "linkRange", pokemon) : 3.5, geometry: "circle", style: "hold",
                color: 0xFF9FBF, label: config && config.tight ? "牵手·紧握" : "牵手·松开" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_holdhands:windup", holdhandsScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) { done(action); return; }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const ticks = Math.max(80, Math.round(p(holdhandsId, "linkTicks", action)));
            const radius = Math.max(2, p(holdhandsId, "linkRange", action));
            const share = Math.max(0.005, Math.min(0.08, p(holdhandsId, "healShare", action)));
            const interval = Math.max(10, Math.round(p(holdhandsId, "healInterval", action)));
            const motes = Math.max(8, Math.round(p(holdhandsId, "motes", action)));
            // 先解除自己与伙伴双方现有的牵手关系，再建新的一对；这样 A 换伙伴或 C 抢 B 时不会有旧链残留。
            holdhandsBreak(world, self);
            holdhandsBreak(world, target);
            const selfCarrier = MobEffects.apply(world, self, holdhandsEffect, ticks, 0);
            const partnerCarrier = MobEffects.apply(world, target, holdhandsEffect, ticks, 0);
            if (selfCarrier === null || partnerCarrier === null) {
                if (selfCarrier !== null && world.valid(self)) MobEffects.consume(world, self, holdhandsEffect);
                done(action);
                return;
            }
            world.effect(holdhandsLink, self, JSON.stringify({ partner: String(target.ref()), radius: radius, share: share,
                interval: interval, motes: motes, selfAnchor: MobEffects.anchor(selfCarrier),
                partnerAnchor: MobEffects.anchor(partnerCarrier) }), ticks);
            sound(action, "minecraft:block.note_block.chime");
            WorldFeedback.emit(world, holdhandsScene, 1, mate.position(),
                { moment: "clasp", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    motes: motes, scale: Math.max(0.6, Math.min(2, radius / 4.5)) }, 30);
            WorldFeedback.text(world, holdhandsAbove(mate.position()), holdhandsClaspText, [Math.round(ticks / 20)], 28);
            done(action);
        }
    });
}
