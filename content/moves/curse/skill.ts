/** 幽灵押血留下有限咒债；其他属性可自行交换能力等级。周期伤害沿效果来源交付原生结算。 */
namespace PokemonSkills {
    function curseAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 幽灵形态按当前属性判定（含别的单元改过属性的情况），玩家与原版生物没有属性，走非幽灵分支。 */
    function curseIsGhost(world: CombatWorld, actor: CombatActor): boolean {
        const types = PokemonDamage.combatants.read(world, actor).types;
        return types.indexOf("ghost") >= 0;
    }

    WorldCombat.effect(cursedBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "share", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid curse bind: " + key);
        });
        if (value.interval < 1 || value.share <= 0 || value.left < 0) throw new Error("Invalid curse bind");
        if (typeof value.caster !== "string") throw new Error("Invalid curse bind: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(cursedBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        data.lease = MobEffects.bind(effect.world(), effect.target(), cursedHex); effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(cursedBind, "watch", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null || !MobEffects.present(world, JSON.parse(effect.state()).lease)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "haunt", curseScene, 1, body.position(), { moment: "haunt", target: String(target.ref()) });
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(cursedBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * data.share));
        PokemonDamage.residual(world, victim, "curse", amount, { share: data.share, left: data.left - 1 });
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(cursedBind, "operation:world_combat:dispel", function (effect) { effect.end(); });

    PokemonDamage.onDamageApplied("world_combat:curse/residual", receipt => {
        const fact = WorldFeedback.receipt(receipt.event);
        if (fact === null || !(fact.actual > 0)) return;
        const world = receipt.world, at = fact.point;
        WorldFeedback.emit(world, curseScene, 1, at, { moment: "toll", target: String(receipt.target.ref()),
            share: receipt.data.share, burst: Math.round(12 + receipt.data.share * 90), left: receipt.data.left }, 24);
        WorldFeedback.text(world, curseAbove(at), curseTextToll, [], 22);
        world.sound("minecraft:particle.soul_escape", at, 12, "{}");
    }, { move: "curse", segment: "residual" });
    WorldCombat.effectHandler(cursedBind, "end", effect => {
        const world = effect.world(), body = world.observe(effect.target());
        if (body !== null) WorldFeedback.emit(world, curseScene, 1, body.position(), { moment: "lift", target: String(effect.target().ref()) }, 24);
    });

    define({
        id: curseId,
        cooldownParameter: "recharge", name: "诅咒",
        description: "一次交换：幽灵属性当场押出一截最大生命，把逐段扣血的债记在对手身上；其他属性的个体押上敏捷，换来物攻与防御的提升。非幽灵可对自己使用。",
        uses: ["押上一截生命，给对手记一笔慢债", "把敏捷换成凶悍与硬壳", "逼对手分心去清状态或速战速决"],
        kind: "aim", range: 5, maxRange: 8,
        prepare: 9, active: 0, recover: 8, cooldown: 90, style: "curse",
        defaults: { bloodpact: false },
        fields: [flag("bloodpact", "血契")],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[curseId], detail: { values: config }, world: world || null, actor: actor || null };
            const ghost = curseGhostType(pokemon), blood = !!(config && config.bloodpact);
            return {
                prepare: Math.max(3, Math.round(p(curseId, "tempo", context)) + (ghost ? 0 : -1)),
                recover: Math.round(p(curseId, "aftercast", context)),
                cooldown: Math.round(p(curseId, "recharge", context)) + (ghost ? 6 : blood ? 4 : 0),
                active: 0, range: p(curseId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (body === null) return "invalid-target";
            if (curseIsGhost(world, self)) {
                if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
                const victim = world.observe(target);
                if (victim === null || victim.position().minus(body.position()).length() > action.range() || !world.clear(body.position(), victim.position())) return "target-not-visible";
                if (CombatStatus.has(world, target, curseStatus)) return "already-cursed";
                const cost = p(curseId, "bloodCost", action);
                if (body.health() <= body.maxHealth() * cost + 0.5) return "too-weak";
            }
            return "";
        },
        indicator: function (config, pokemon) {
            if (curseGhostType(pokemon))
                return { radius: pokemon ? p(curseId, "reach", pokemon) : 5, geometry: "line", style: "curse",
                    color: 0x9B6BD6, label: config && config.bloodpact ? "诅咒·血契" : "诅咒·稳咒" };
            return { radius: 1, geometry: "circle", style: "curse", color: 0xB4453F, label: "诅咒·自缚" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_curse:windup", curseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const blood = !!(config && config.bloodpact);
            if (curseIsGhost(world, self)) {
                const target = action.target();
                if (target === null || !world.valid(target) || world.friendly(target)) { done(action); return; }
                const targetBody = world.observe(target);
                if (targetBody === null || targetBody.position().minus(body.position()).length() > action.range() || !world.clear(body.position(), targetBody.position())) { done(action); return; }
                if (CombatStatus.has(world, target, curseStatus)) { done(action); return; }
                const cost = Math.max(0.05, Math.min(0.6, p(curseId, "bloodCost", action)));
                const floor = Math.max(1, body.maxHealth() * 0.05);
                const paid = Math.max(0, Math.min(body.maxHealth() * cost, body.health() - floor));
                const share = Math.max(0.05, Math.min(0.35, p(curseId, "hexShare", action)));
                const ticks = Math.max(60, Math.round(p(curseId, "hexTicks", action)));
                const interval = Math.max(20, Math.round(p(curseId, "hexInterval", action)));
                const carrier = MobEffects.apply(world, target, cursedHex, ticks, 0);
                if (carrier === null) { done(action); return; }
                const payment = paid > 0 ? -world.health(self, -paid, "world_combat:curse") : 0;
                if (!(payment > 0)) { world.removeMobEffect(target, cursedHex, carrier.key()); done(action); return; }
                const existing = world.effects(target, cursedBind);
                for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
                const left = Math.max(1, Math.floor(ticks / interval));
                world.effect(cursedBind, target, JSON.stringify({ interval: interval, share: share, left: left, caster: String(self.ref()) }), ticks);
                sound(action, "minecraft:entity.evoker.prepare_attack");
                const victim = world.observe(target);
                if (victim !== null) {
                    WorldFeedback.emit(world, curseScene, 1, victim.position(),
                        { moment: "hex", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                            share: share, pulses: left, paid: Math.round(payment) }, 30);
                    WorldFeedback.text(world, curseAbove(victim.position()), curseTextHex, [left], 30);
                }
            } else {
                const gain = Math.max(1, Math.round(p(curseId, "pactGain", action)));
                NativeEffects.boost(world, self, "atk", gain);
                NativeEffects.boost(world, self, "def", gain);
                NativeEffects.boost(world, self, "spe", -gain);
                const pactTicks = 40 + gain * 10;
                MobEffects.apply(world, self, cursePact, pactTicks, gain);
                sound(action, "minecraft:entity.evoker.cast_spell");
                WorldFeedback.emit(world, curseScene, 1, body.position(),
                    { moment: "pact", target: String(self.ref()), gain: gain, burst: gain * 16 }, 30);
                WorldFeedback.text(world, curseAbove(body.position()), curseTextPact, [gain, gain], 30);
            }
            done(action);
        }
    });
}
