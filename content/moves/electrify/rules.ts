/** 输电：对任意关系实体通电，下一次符合条件的动作提交时消费，并锁存整次动作改写。 */
namespace PokemonSkills {
    WorldCombat.effect(electrifyPayload, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value.all !== 0 && value.all !== 1) throw new Error("Invalid electrify payload");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid electrify carrier");
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

    /** The latest payload bound to the exact native carrier still on the actor; stale payloads never count. */
    function electrifyCarrierView(world: CombatWorld, actor: CombatActor): any | null {
        if (!world.valid(actor)) return null;
        const carrier = MobEffects.read(world, actor, electrified);
        if (carrier === null) return null;
        const anchor = MobEffects.anchor(carrier), views = world.effects(actor, electrifyPayload);
        for (let i = 0; i < views.length; i++) {
            const value = JSON.parse(String(views[i].data()));
            if (value.carrier && value.carrier.id === anchor.id && value.carrier.key === anchor.key) return value;
        }
        return null;
    }
    function electrifyAllows(world: CombatWorld, actor: CombatActor, type: string): boolean {
        const view = electrifyCarrierView(world, actor);
        if (view === null) return false;
        type = String(type || "").toLowerCase();
        return view.all ? type !== "electric" : type === "normal";
    }
    function electrifyRelease(world: CombatWorld, actor: CombatActor): void {
        world.effects(actor, electrifyPayload).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
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
        // 原生路径由 NativeAttackTypes.conversions 先判定并标记；脚本路径由 metadata 规则标记。
        const eligible = context.metadata.some(data => data.electrifyConverted === true || data.electrifyApplied === true);
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

    // 原生攻击：共享层已把已知近战/箭/三叉戟等分类为 normal；本招在分类给出的 baseType 上做一次属性改写，
    // 之后由 NativeAttackTypes 统一套用本系、相性与原生结算，不再自行乘类型表。未分类的攻击保持未知。
    // 一次执行锁存在 MoveExecutions；同一弹体的后续交付沿用已锁存的决定，不会重复改写或重复消耗。
    NativeAttackTypes.conversions.define({ id: "world_combat:move_electrify/native", apply: function (context) {
        const world = context.world, source = context.source;
        if (!world || !source || !world.valid(source)) return;
        const held = MoveExecutions.read(world, electrifyExecution);
        if (held !== null && held.enabled === true && held.native === true) {
            context.type = "electric"; context.data.electrifyConverted = true; return;
        }
        if (!electrifyAllows(world, source, context.type)) return;
        context.type = "electric"; context.data.electrifyConverted = true;
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
