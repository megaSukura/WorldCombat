/** Transfer one preparation beat, with an owned waiting token and an independent cost to the helper. */
namespace PokemonSkills {
    interface AfterYouState { carrier: MobEffects.Anchor; haste: number; motes: number; max: number; spent?: number; player?: boolean; }
    function afteryouActive(effect: CombatEffect, state: AfterYouState): boolean {
        const world = effect.world();
        if (!world.valid(effect.target()) || !MobEffects.matches(world, effect.target(), state.carrier)) { effect.end(); return false; }
        return true;
    }
    function afteryouGo(effect: CombatEffect, state: AfterYouState, ticks: number): void {
        const world = effect.world(), body = world.observe(effect.target());
        state.spent = ticks; effect.state(JSON.stringify(state));
        if (body) {
            WorldFeedback.emit(world, afteryouScene, 1, body.position(), { moment: "go", target: String(effect.target().ref()), motes: state.motes, haste: state.haste }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
                ticks < 0 ? "world_combat.move.afteryou.text.native" : afteryouGoText, ticks < 0 ? [] : [ticks], 28);
        }
        effect.end();
    }
    function afteryouAdvance(effect: CombatEffect, state: AfterYouState): boolean {
        const world = effect.world(), pending = LivingActions.preparing(world, effect.target())
            .filter(clock => clock.advanced === 0 && clock.remaining > 1).sort((a, b) => b.remaining - a.remaining);
        if (!pending.length) return false;
        const clock = pending[0], requested = Math.max(1, Math.floor(clock.remaining * state.haste / (100 + state.haste)));
        const ticks = LivingActions.advancePreparation(world, effect.target(), clock.instance, requested);
        if (!(ticks > 0)) return false;
        afteryouGo(effect, state, ticks); return true;
    }
    [afteryouMark, afteryouDrag].forEach(id => {
        WorldCombat.effect(id, 2, 1200, "actor", json => {
            const value = JSON.parse(json);
            if (!MobEffects.validAnchor(value.carrier) || !isFinite(value.haste) || value.haste < 0) throw new Error("Invalid beat transfer");
            return JSON.stringify(value);
        }, () => { throw new Error("Beat transfer ownership changed"); });
        WorldCombat.effectHandler(id, "start", id === afteryouMark ? afteryouStart : afteryouCostStart);
        WorldCombat.effectHandler(id, "operation:world_combat:dispel", effect => effect.end());
    });
    function afteryouStart(effect: CombatEffect): void {
        const state: AfterYouState = JSON.parse(effect.state()), world = effect.world();
        if (!afteryouActive(effect, state)) return;
        MobEffects.bind(world, effect.target(), state.carrier.id);
        if (afteryouAdvance(effect, state)) return;
        const body = world.observe(effect.target()); if (!body) { effect.end(); return; }
        if (body.player()) {
            state.player = world.attribute(effect.target(), "minecraft:generic.attack_speed", state.haste / 100, "add_multiplied_total");
            effect.state(JSON.stringify(state));
        }
        world.present("world_combat:afteryou/pending", afteryouScene, 1, body.position(), JSON.stringify({
            moment: "ready", target: String(effect.target().ref()), motes: state.motes, haste: state.haste
        }));
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effectHandler(afteryouMark, "watch", effect => {
        const state: AfterYouState = JSON.parse(effect.state());
        if (afteryouActive(effect, state) && !afteryouAdvance(effect, state)) effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(afteryouMark, "operation:world_combat:afteryou/native", effect => {
        const state: AfterYouState = JSON.parse(effect.state());
        if (state.player && String(effect.caller().key()) === String(effect.target().key()) && afteryouActive(effect, state)) afteryouGo(effect, state, -1);
    });
    WorldCombat.on("world_combat:move_afteryou/native", "world_combat:damage_incoming", "", event => {
        const data: CombatNativeDamageFacts = JSON.parse(event.data()), world = event.world();
        if (data.scripted || data.damageType !== "minecraft:player_attack" || !data.sourceActor) return;
        world.effects(event.actor(), afteryouMark).forEach(view => world.operation(view.id(), "world_combat:afteryou/native", "{}"));
    });
    WorldCombat.effectHandler(afteryouMark, "end", effect => {
        const state: AfterYouState = JSON.parse(effect.state()), world = effect.world();
        if (state.spent || !world.valid(effect.target())) return;
        const body = world.observe(effect.target()); if (body) WorldFeedback.emit(world, afteryouScene, 1, body.position(),
            { moment: "fade", target: String(effect.target().ref()), motes: state.motes }, 22);
    });
    function afteryouCostStart(effect: CombatEffect): void {
        const state: AfterYouState = JSON.parse(effect.state()), world = effect.world();
        if (!afteryouActive(effect, state)) return;
        MobEffects.bind(world, effect.target(), state.carrier.id);
        world.attribute(effect.target(), "world_combat:skill_haste", -state.haste, "add_value");
        effect.schedule("watch", "watch", 1, "{}");
    }
    WorldCombat.effectHandler(afteryouDrag, "watch", effect => {
        if (afteryouActive(effect, JSON.parse(effect.state()))) effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(afteryouDrag, "end", effect => {
        const world = effect.world(), body = world.valid(effect.target()) && world.observe(effect.target());
        if (body) WorldFeedback.emit(world, afteryouScene, 1, body.position(), { moment: "recover", target: String(effect.target().ref()) }, 20);
    });

    define({
        id: afteryouId,
        cooldownParameter: "recharge",
        name: "您先请",
        description: "把一拍让给近处伙伴：实际缩短其当前或等待窗内下一次标准准备，至少留一刻；同次准备只受助一次。玩家得到一次原生近战攻速助力。自己短时恢复变慢。",
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
                help: "催促：催速强度 ×1.2、等待窗 ×0.7；托付：强度 ×0.85、等待窗 ×1.4。两种方式都只提前一次准备。"
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
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), target = action.target(), body = world.observe(self);
            const ally = target && world.observe(target);
            if (!target || !body || !ally || String(self.key()) === String(target.key()) || !world.friendly(target)
                || ally.position().minus(body.position()).length() > p(afteryouId, "reach", action) || !world.clear(body.position(), ally.position())) { done(action); return; }
            const ticks = Math.max(20, Math.round(p(afteryouId, "readyTicks", action))), haste = Math.max(1, p(afteryouId, "haste", action));
            const motes = Math.max(6, Math.round(p(afteryouId, "motes", action))), yielding = Math.max(20, Math.round(p(afteryouId, "yieldTicks", action)));
            const cost = MobEffects.apply(world, self, afteryouYield, yielding, 0);
            if (!cost) { done(action); return; }
            const carrier = MobEffects.apply(world, target, afteryouReady, ticks, 0);
            if (!carrier) { world.removeMobEffect(self, cost.id(), cost.key()); done(action); return; }
            world.effect(afteryouDrag, self, JSON.stringify({ carrier: MobEffects.anchor(cost), haste: Math.max(5, p(afteryouId, "drag", action)), motes: 0, max: yielding }), yielding);
            world.effect(afteryouMark, target, JSON.stringify({ carrier: MobEffects.anchor(carrier), haste: haste, motes: motes, max: ticks }), ticks);
            WorldFeedback.emit(world, afteryouScene, 1, body.position(), { moment: "call", target: String(target.ref()),
                path: [String(self.ref()), String(target.ref())], motes: motes, haste: haste }, 24);
            WorldFeedback.text(world, ally.position().plus(WorldCombat.point(0, 1.15, 0)), afteryouCallText, [Math.round(ticks / 20)], 32);
            sound(action, "minecraft:block.amethyst_block.chime"); done(action);
        }
    });
}
