/**
 * 牵手 / Hold Hands —— 执行组织。
 *
 * 核心念头：两只宝可梦拉起手来。一条暖色的链子连着他们；只要链子还在，两个人每隔一小段就从彼此那里
 *   匀回一点体力。链子有长度——走远了连接就断，两端同时失去这份幸福。
 *
 * 出手：短起手（windup 在手上聚起心光），提交后给双方挂共享身份 world_combat:status/holdhands
 *   （本单元效果 world_combat:hand_in_hand），并以施法者为宿主起连接效果 world_combat:holdhands_link。
 * 持续：连接每 healInterval 刻检查一次——两人都在链子长度内、身份都还在，就各按自身最大生命回复 healShare，
 *   同时把连接画面沿两人之间续上；任何一边离开范围或被清掉状态，连接立刻断开。
 * 结束：连接走完或被断开时，收回双方的身份，链子安静散去（正常到点）或当场崩断（拉开距离）。
 * 反制：这是一条站位约定——把其中一人击退或换位、或用清除类效果解掉身份，都能让疗伤提前结束。
 */
namespace PokemonSkills {
    function holdhandsAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    function holdhandsHeal(world: CombatWorld, actor: CombatActor, amount: number, cause: string): number {
        if (amount <= 0 || !world.valid(actor)) return 0;
        let healed = 0;
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, actor, pokemon, amount / scale, cause);
        } else {
            healed = world.health(actor, amount, "world_combat:" + cause);
        }
        const after = world.observe(actor);
        if (healed > 0 && after !== null) feedback(world, actor, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    WorldCombat.effect(holdhandsLink, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.partner !== "string") throw new Error("Invalid holdhands link: partner");
        ["radius", "share", "interval", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid holdhands link: " + key);
        });
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
        const scale = Math.max(0.6, Math.min(2, Number(data.radius) / 4.5));
        if (body.position().minus(mate.position()).length() > Number(data.radius)) {
            data.reason = "snap";
            effect.state(JSON.stringify(data));
            effect.end();
            return;
        }
        if (MobEffects.read(world, caster, holdhandsEffect) === null || MobEffects.read(world, partner, holdhandsEffect) === null) { effect.end(); return; }
        holdhandsHeal(world, caster, body.maxHealth() * Number(data.share), "holdhands");
        const after = world.observe(caster), mateNow = world.observe(partner);
        if (after === null || mateNow === null) { effect.end(); return; }
        holdhandsHeal(world, partner, mateNow.maxHealth() * Number(data.share), "holdhands");
        const refresh = Math.max(10, Math.min(effect.remaining(), Math.round(Number(data.interval) * 3)));
        MobEffects.apply(world, caster, holdhandsEffect, refresh, 0);
        MobEffects.apply(world, partner, holdhandsEffect, refresh, 0);
        WorldFeedback.keep(world, "world_combat:move_holdhands/warm/" + String(caster.ref()), holdhandsScene, 1, mateNow.position(),
            { moment: "warm", path: [String(caster.ref()), String(partner.ref())], target: String(partner.ref()),
                motes: data.motes, scale: scale }, 40);
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(Number(data.interval))), "{}");
    });
    WorldCombat.effectHandler(holdhandsLink, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(holdhandsLink, "end", function (effect) {
        const world = effect.world(), caster = effect.target(), data = JSON.parse(effect.state());
        MobEffects.consume(world, caster, holdhandsEffect);
        const partner = world.actor(data.partner);
        if (partner !== null && world.valid(partner)) MobEffects.consume(world, partner, holdhandsEffect);
        const body = world.observe(caster);
        if (body === null) return;
        const snap = data.reason === "snap", scale = Math.max(0.6, Math.min(2, Number(data.radius) / 4.5));
        WorldFeedback.emit(world, holdhandsScene, 1, body.position(),
            { moment: snap ? "snap" : "fade", target: String(caster.ref()), motes: data.motes, scale: scale }, 24);
        WorldFeedback.text(world, holdhandsAbove(body.position()), snap ? holdhandsSnapText : holdhandsFadeText, [], 22);
    });

    // 持续心光：带身份者每 20 刻在头顶浮起一簇心形光。
    WorldCombat.on("world_combat:move_holdhands/heart", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== holdhandsEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, holdhandsEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_holdhands/heart/" + String(actor.ref()), holdhandsScene, 1, body.position(),
            { moment: "mark", target: String(actor.ref()) }, 40);
    });

    define({
        id: holdhandsId, name: "牵手",
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
            MobEffects.apply(world, self, holdhandsEffect, ticks, 0);
            MobEffects.apply(world, target, holdhandsEffect, ticks, 0);
            const existing = world.effects(self, holdhandsLink);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(holdhandsLink, self, JSON.stringify({ partner: String(target.ref()), radius: radius, share: share, interval: interval, motes: motes }), ticks);
            sound(action, "minecraft:block.note_block.chime");
            WorldFeedback.emit(world, holdhandsScene, 1, mate.position(),
                { moment: "clasp", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    motes: motes, scale: Math.max(0.6, Math.min(2, radius / 4.5)) }, 30);
            WorldFeedback.text(world, holdhandsAbove(mate.position()), holdhandsClaspText, [Math.round(ticks / 20)], 28);
            done(action);
        }
    });
}
