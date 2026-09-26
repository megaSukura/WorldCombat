/**
 * 极光幕 / auroraveil 的极光区规则与结算，只护住友方。
 *
 * 极光区由 WorldEffects.field 驱动：每 5 刻扫描半径内的活体，给**友方**补 world_combat:auroraveil_screen
 *   （身份 world_combat:status/auroraveil）与自己的 world_combat:auroraveil_mark；离开圈子、被墙隔断或极光结束时收回。
 *   每个受护者的标记上挂一条连回幕心的细丝表现（`WorldFeedback.onEffect`），标记一收，细丝同时断。
 *   受击时在 NativeEffects.incomingRules 里读到受击者的标记，按 cutPhys／cutSpec 分别削减物理与特殊伤害。
 * 极光只护友方，敌人走进来也读不到幕——这是它和「玩水」一视同仁的水洼最大的不同。
 */
namespace PokemonSkills {
    function auroraVeilPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function auroraVeilMarkOf(world: CombatWorld, actor: CombatActor, category: string): any {
        const views = world.effects(actor, auroraveilMark), key = category === "physical" ? "cutPhys" : "cutSpec";
        let best: any = null;
        for (let i = 0; i < views.length; i++) {
            const data = JSON.parse(String(views[i].data()));
            if (best === null || data[key] > best[key]) best = data;
        }
        return best;
    }
    /** 受护者到幕心的细丝；绑在这名受护者的标记效果上，离区、被墙隔断或驱散时随标记一起收走。 */
    function auroraVeilThread(world: CombatWorld, actor: CombatActor, markId: number, field: WorldEffects.Field): void {
        if (typeof markId !== "number" || markId <= 0) return;
        if (world.observe(actor) === null) return;
        const centre = auroraVeilPoint(field);
        WorldFeedback.onEffect(world, markId, "world_combat:move_auroraveil/thread/" + markId, auroraveilScene, 1, centre,
            { moment: "thread", target: String(actor.ref()),
                path: [String(actor.ref()), [centre.x(), centre.y() + 0.1, centre.z()]],
                ribbons: field.data.ribbons, ceiling: field.data.ceiling });
    }
    function auroraVeilApply(world: CombatWorld, actor: CombatActor, ticks: number, field: WorldEffects.Field): boolean {
        if (MobEffects.apply(world, actor, auroraveilEffect, ticks, 0) === null) return false;
        const data: any = {};
        Object.keys(field.data).forEach(function (key) { data[key] = field.data[key]; });
        data.fieldId = field.id;
        const views = world.effects(actor, auroraveilMark);
        for (let i = 0; i < views.length; i++) {
            const state = JSON.parse(String(views[i].data()));
            if (state.fieldId === field.id && world.operation(views[i].id(), "world_combat:refresh", JSON.stringify({ ticks: ticks }))) {
                auroraVeilThread(world, actor, views[i].id(), field);
                return true;
            }
        }
        const markId = world.effect(auroraveilMark, actor, JSON.stringify(data), ticks);
        auroraVeilThread(world, actor, markId, field);
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
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const ticks = JSON.parse(effect.input()).ticks;
        if (typeof ticks !== "number" || !isFinite(ticks) || ticks < 1 || ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.remaining(Math.max(1, Math.min(900, Math.round(ticks))));
    });
    WorldCombat.effectHandler(auroraveilMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    // 标记一走（自然到期、离区、被墙隔断或驱散），连回幕心的细丝当场断在受护者身上。
    WorldCombat.effectHandler(auroraveilMark, "end", function (effect) {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null) return;
        let ribbons = 6;
        try { const state = JSON.parse(effect.state()); if (typeof state.ribbons === "number") ribbons = state.ribbons; } catch (error) { }
        WorldFeedback.emit(world, auroraveilScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), ribbons: ribbons }, 24);
    });

    WorldEffects.fieldRule(auroraveilField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            auroraVeilApply(world, actor, Math.max(40, Math.round(Number(field.data.margin) || 60)), field);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, auroraveilScene, 1, body.position(),
                { moment: "cover", target: String(actor.ref()), ribbons: field.data.ribbons }, 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            auroraVeilApply(world, actor, Math.max(40, Math.round(Number(field.data.margin) || 60)), field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            const views = world.effects(actor, auroraveilMark);
            for (let i = 0; i < views.length; i++) {
                const data = JSON.parse(String(views[i].data()));
                if (data.fieldId === field.id) world.operation(views[i].id(), "world_combat:dispel", "{}");
            }
            if (!world.effects(actor, auroraveilMark).length) MobEffects.consume(world, actor, auroraveilEffect);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = auroraVeilPoint(field);
            WorldFeedback.keep(world, "world_combat:move_auroraveil/field/" + effect.id(), auroraveilScene, 1, centre,
                { moment: "veil", ribbons: field.data.ribbons, scale: field.radius / 4,
                    ceiling: field.data.ceiling, midHeight: field.data.midHeight,
                    highRibbons: field.data.highRibbons, lowRibbons: field.data.lowRibbons }, 20);
        }
    }, { tags: [WorldEffects.categories.screen], transferable: true });

    /** 极光下的友方：按伤害类别分别削减。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_auroraveil/screen", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.bypassesInvulnerability || !(data.amount > 0)) return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target) || MobEffects.read(world, target, auroraveilEffect) === null) return;
        const category = String(data.category);
        if (category !== "physical" && category !== "special") return;
        const mark = auroraVeilMarkOf(world, target, category);
        if (mark === null) return;
        const share = Math.max(0, Math.min(0.8, Number(category === "physical" ? mark.cutPhys : mark.cutSpec) || 0));
        if (share <= 0) return;
        const before = data.amount;
        const blocked = before * share;
        data.amount = Math.max(0, before - blocked);
        const body = world.observe(target);
        if (body === null) return;
        const source = hit.source, attacker = source && world.valid(source) && String(source.key()) !== String(target.key()) ? world.observe(source) : null;
        const burst = Math.max(6, Math.min(24, Math.round(blocked * 2)));
        const payload: any = { moment: "block", target: String(target.ref()),
            blocked: Math.round(blocked * 10) / 10, burst: burst, ribbons: mark.ribbons };
        if (attacker !== null) {
            const away = attacker.position().minus(body.position());
            if (away.length() > 0.01) { const direction = away.unit(); payload.direction = [direction.x(), direction.y(), direction.z()]; }
        }
        WorldFeedback.emit(world, auroraveilScene, 1, body.position(), payload, 22);
    } });
}
