/** 输电：对任意关系实体通电，下一次符合条件的动作提交时消费，并锁存整次动作改写。 */
namespace PokemonSkills {
    WorldCombat.effect(electrifyPayload, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value.all !== 0 && value.all !== 1) throw new Error("Invalid electrify payload");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(electrifyPayload, "start", effect => effect.schedule("aura", "aura", 1, "{}"));
    WorldCombat.effectHandler(electrifyPayload, "aura", effect => {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null || MobEffects.read(world, actor, electrified) === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "aura", electrifyScene, 1, body.position(), { moment: "linger", target: String(actor.ref()) });
        effect.schedule("aura", "aura", 20, "{}");
    });
    WorldCombat.effectHandler(electrifyPayload, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function electrifyAllows(world: CombatWorld, actor: CombatActor, type: string): boolean {
        const views = world.effects(actor, electrifyPayload);
        const all = views.length ? !!JSON.parse(String(views[0].data())).all : false;
        type = String(type || "").toLowerCase();
        return all ? type !== "electric" : type === "normal";
    }
    function electrifyRelease(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, electrifyPayload);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }

    const electrifyExecution = "world_combat:electrify/execution";
    // 预览仍读持电；真实结算只读这次已提交动作自己的改写决定。
    PokemonDamage.metadata.define({ id: "world_combat:move_electrify/convert", apply: function (context) {
        if (!context.world || !context.actor) return;
        const held = MoveExecutions.read(context.world, electrifyExecution);
        if (held !== null) { if (held.enabled) context.metadata.type = "electric"; return; }
        if (!context.preview) return;
        if (!CombatStatus.has(context.world, context.actor, "electrify")) return;
        if (!electrifyAllows(context.world, context.actor, context.metadata.type)) return;
        context.metadata.type = "electric";
        (<any>context.metadata).electrifyApplied = true;
    } });

    MoveExecutions.committed.define({ id: "world_combat:move_electrify/commit", apply: function (context) {
        const world = context.world, source = context.actor;
        const eligible = context.metadata.some(data => context.native ? electrifyAllows(world, source, data.type) : data.electrifyApplied === true);
        const enabled = eligible && MobEffects.consume(world, source, electrified) !== null;
        MoveExecutions.write(world, electrifyExecution, { enabled: enabled, native: context.native });
        if (!enabled) return;
        context.metadata.forEach(data => data.type = "electric");
        electrifyRelease(world, source);
        const body = world.observe(source);
        if (body === null) return;
        const power = context.metadata.reduce((best, data) => Math.max(best, Number(data.power) || 0), 0);
        const surge = Math.max(1, Math.min(3, power / 40));
        WorldFeedback.emit(world, electrifyScene, 1, body.position(),
            { moment: "discharge", target: String(source.ref()), surge: surge, burst: Math.round(20 * surge) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electrifySpentText, [], 22);
    } });
    // 原生攻击只有交付事实时才作决定，后续同一弹体/伤害源沿用决定；不把未知原生类型猜成一般。
    NativeEffects.incomingRules.define({ id: "world_combat:move_electrify/native", after: ["world_combat:execution/native"], apply: function (hit) {
        const held = MoveExecutions.read(hit.world, electrifyExecution);
        if (!held || !held.enabled || !held.native || hit.data.calculation || !DamageSemantics.read(hit.data).attack) return;
        hit.data.type = "electric";
        const source = PokemonDamage.combatants.read(hit.world, hit.source), target = PokemonDamage.combatants.read(hit.world, hit.target);
        let factor = source.types.indexOf("electric") >= 0 ? PokemonDamage.multipliers.sameType : 1;
        target.types.forEach(type => factor *= CobblemonCombat.typeEffectiveness("electric", type));
        hit.data.amount *= factor;
        hit.data.electrifyConverted = true;
    } });

    // 自散：没等到出招就用完时间，电荷安静褪去。
    WorldCombat.on("world_combat:move_electrify/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== electrified) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        electrifyRelease(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, electrifyScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 20);
    });
}
