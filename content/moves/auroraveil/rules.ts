/**
 * 极光幕 / auroraveil 的极光区规则与结算，只护住友方。
 *
 * 极光区由 WorldEffects.field 驱动：每 5 刻扫描半径内的活体，给**友方**补 world_combat:auroraveil_screen
 *   （身份 world_combat:status/auroraveil）与自己的 world_combat:auroraveil_mark；离开圈子或极光结束时收回。
 *   受击时在 NativeEffects.incomingRules 里读到受击者的标记，按 cutPhys／cutSpec 分别削减物理与特殊伤害。
 * 极光只护友方，敌人走进来也读不到幕——这是它和「玩水」一视同仁的水洼最大的不同。
 */
namespace PokemonSkills {
    function auroraVeilPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function auroraVeilMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, auroraveilMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function auroraVeilApply(world: CombatWorld, actor: CombatActor, ticks: number, data: any): boolean {
        if (MobEffects.apply(world, actor, auroraveilEffect, ticks, 0) === null) return false;
        const views = world.effects(actor, auroraveilMark);
        for (let i = 0; i < views.length; i++)
            if (world.operation(views[i].id(), "world_combat:refresh", JSON.stringify({ ticks: ticks }))) return true;
        world.effect(auroraveilMark, actor, JSON.stringify(data), ticks);
        return true;
    }

    WorldCombat.effect(auroraveilMark, 1, 900, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["cutPhys", "cutSpec", "radius", "ribbons"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid auroraveil mark: " + key);
        });
        if (value.radius <= 0 || value.ribbons <= 0) throw new Error("Invalid auroraveil mark extent");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(auroraveilMark, "start", function () { });
    WorldCombat.effectHandler(auroraveilMark, "operation:world_combat:refresh", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const ticks = JSON.parse(effect.input()).ticks;
        if (typeof ticks !== "number" || !isFinite(ticks) || ticks < 1 || ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.remaining(Math.max(1, Math.min(900, Math.round(ticks))));
    });
    WorldCombat.effectHandler(auroraveilMark, "operation:world_combat:dispel", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });

    WorldEffects.fieldRule(auroraveilField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            auroraVeilApply(world, actor, Math.max(40, Math.round(Number(field.data.margin) || 60)), field.data);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, auroraveilScene, 1, body.position(),
                { moment: "cover", target: String(actor.ref()), ribbons: field.data.ribbons }, 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            auroraVeilApply(world, actor, Math.max(40, Math.round(Number(field.data.margin) || 60)), field.data);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            MobEffects.consume(world, actor, auroraveilEffect);
            const views = world.effects(actor, auroraveilMark);
            for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = auroraVeilPoint(field);
            WorldFeedback.keep(world, "world_combat:move_auroraveil/field/" + effect.id(), auroraveilScene, 1, centre,
                { moment: "veil", ribbons: field.data.ribbons, scale: field.radius / 4 }, 20);
        }
    }, { tags: [WorldEffects.categories.screen] });

    /** 极光下的友方：按伤害类别分别削减。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_auroraveil/screen", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.bypassesInvulnerability || !(data.amount > 0)) return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target) || !world.friendly(target)) return;
        const category = String(data.category);
        if (category !== "physical" && category !== "special") return;
        const mark = auroraVeilMarkOf(world, target);
        if (mark === null) return;
        const share = Math.max(0, Math.min(0.8, Number(category === "physical" ? mark.cutPhys : mark.cutSpec) || 0));
        if (share <= 0) return;
        const before = data.amount;
        const blocked = before * share;
        data.amount = Math.max(0, before - blocked);
        const body = world.observe(target);
        if (body === null) return;
        const source = hit.source, attacker = source && world.valid(source) && String(source.key()) !== String(target.key()) ? world.observe(source) : null;
        const payload: any = { moment: "block", target: String(target.ref()), blocked: Math.round(blocked * 10) / 10, ribbons: mark.ribbons };
        if (attacker !== null) {
            const away = attacker.position().minus(body.position());
            if (away.length() > 0.01) { const direction = away.unit(); payload.direction = [direction.x(), direction.y(), direction.z()]; }
        }
        WorldFeedback.emit(world, auroraveilScene, 1, body.position(), payload, 22);
    } });
}
