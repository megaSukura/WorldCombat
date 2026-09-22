/**
 * 充能的行为，对所有战斗者一致。
 *
 * charge_up 只借共享身份 `world_combat:status/charge`，行为在这里写：任何生物带着它时，下一次电属性招式
 * 命中都会在结算前把伤害 ×2，并立刻用掉电荷——无论那一招来自哪个单元。判断走 `NativeEffects.incomingRules`
 * （原生伤害的入场结算点），按有效属性 data.type 过滤，所以属性被别的单元改成电的招式同样吃这个加成。
 * charge_mark 是同一股电的机读记录（聚电数量、电晕/放电半径、聚电速度），用来让表现按本招算出的数值画，
 * 并在用掉时知道放电该多大。电荷自然走到头、或用掉时，都从身上炸开/褪去，两条岔路画面不同。
 */
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

    // 电流的兑现点：带电荷者用出电属性招式并命中时，伤害 ×2，电荷炸开。
    NativeEffects.incomingRules.define({ id: "world_combat:move_charge/discharge", apply: function (hit) {
        const data = hit.data;
        if (!data || data.kind !== "move" || data.type !== "Electric") return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source)) return;
        const mark = chargeMarkOf(world, source);
        if (MobEffects.consume(world, source, chargeUp) === null) return;
        data.amount *= 2;
        chargeReleaseMark(world, source);
        const body = world.observe(source);
        if (body === null) return;
        const power = typeof data.power === "number" && isFinite(data.power) ? data.power : 0;
        const surge = Math.max(1, Math.min(3, power / 40));
        WorldFeedback.emit(world, chargeScene, 1, body.position(),
            { moment: "discharge", actor: String(source.ref()), surge: surge, burst: Math.round(24 * surge),
                scale: Math.max(0.5, (mark ? mark.discharge : 0.9) / 0.9) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), chargeSpentText, [], 24);
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
        WorldFeedback.keep(world, "world_combat:move_charge/aura/" + String(actor.ref()), chargeScene, 1, body.position(),
            { moment: "aura", actor: String(actor.ref()), sparks: mark.sparks, aura: mark.radius, scale: Math.max(0.5, mark.radius / 0.5) }, 40);
    });

    // 自散：时间走完，电荷安静褪去；被外力解除时不播。
    WorldCombat.on("world_combat:move_charge/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== chargeUp || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        chargeReleaseMark(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, chargeScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), chargeFadeText, [], 22);
    });
}
