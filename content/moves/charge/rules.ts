/** 充电：提交下一次电属性攻击时消费电荷，整次动作及其派生段共享加成；特防提升独立保留。 */
namespace PokemonSkills {
    WorldCombat.effect(chargeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.sparks !== "number" || !isFinite(value.sparks)) throw new Error("Invalid charge sparks");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius <= 0) throw new Error("Invalid charge radius");
        if (typeof value.discharge !== "number" || !isFinite(value.discharge) || value.discharge <= 0) throw new Error("Invalid charge discharge");
        if (typeof value.speed !== "number" || !isFinite(value.speed) || value.speed <= 0) throw new Error("Invalid charge speed");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(chargeMark, "start", function () { });
    WorldCombat.effectHandler(chargeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function chargeMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, chargeMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function chargeReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, chargeMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }

    const chargeExecution = "world_combat:charge/execution";
    // 提交时选择整次电招；多段、多个对象与派生效果共用宿主来源中的这一份电。
    MoveExecutions.committed.define({ id: "world_combat:move_charge/commit", after: ["world_combat:move_electrify/commit"], apply: function (context) {
        const world = context.world, source = context.actor;
        const eligible = context.metadata.some(data => String(data.type).toLowerCase() === "electric" && data.category !== "status");
        const mark = chargeMarkOf(world, source);
        const enabled = eligible && MobEffects.consume(world, source, chargeUp) !== null;
        MoveExecutions.write(world, chargeExecution, { enabled: enabled });
        if (!enabled) return;
        chargeReleaseMark(world, source);
        const body = world.observe(source);
        if (body === null) return;
        const power = context.metadata.reduce((best, data) => Math.max(best, Number(data.power) || 0), 0);
        const surge = Math.max(1, Math.min(3, power / 40));
        WorldFeedback.emit(world, chargeScene, 1, body.position(),
            { moment: "discharge", actor: String(source.ref()), surge: surge, burst: Math.round(24 * surge),
                scale: Math.max(0.5, (mark ? mark.discharge : 0.9) / 0.9) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), chargeSpentText, [], 24);
    } });
    NativeEffects.incomingRules.define({ id: "world_combat:move_charge/discharge", after: ["world_combat:execution/native", "world_combat:move_electrify/native"], apply: function (hit) {
        const held = MoveExecutions.read(hit.world, chargeExecution);
        if (held && held.enabled && String(hit.data.type).toLowerCase() === "electric") hit.data.amount *= 2;
    } });

    // 持电：每 20 刻续一次电弧，数量沿用本招算出的聚电数量；电荷没了就不播。
    WorldCombat.on("world_combat:move_charge/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== chargeUp || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, chargeUp) === null) return;
        const mark = chargeMarkOf(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const owner = world.effects(actor, chargeMark)[0];
        if (owner) WorldFeedback.onEffect(world, owner.id(), "aura", chargeScene, 1, body.position(),
            { moment: "aura", actor: String(actor.ref()), sparks: mark.sparks, aura: mark.radius, scale: Math.max(0.5, mark.radius / 0.5) });
    });

    // 自散：时间走完，电荷安静褪去；被外力解除时不播。
    WorldCombat.on("world_combat:move_charge/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== chargeUp) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        chargeReleaseMark(world, actor);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, chargeScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), chargeFadeText, [], 22);
    });
}
