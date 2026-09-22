/**
 * 通电与输电的行为，对所有战斗者一致。
 *
 * electrified 只借共享身份 `world_combat:status/electrify`，行为在这里写：
 *   - `PokemonDamage.metadata` 在结算前读取 payload 的导法，把目标的招式有效属性改成电（全导时任何非电招，
 *     滤波时只改一般属性招式）；改完再进入 STAB、属性相性、电吸收特性与地面免疫的原生结算。
 *   - `NativeEffects.incomingRules` 在电属性伤害真正落地时用掉电荷、爆开并释放 payload。用掉与自散是两种收场。
 * payload 是这份导法的机读记录，随状态一起存在，所以同一只宝可梦的两次输电可以导法不同。
 */
namespace PokemonSkills {
    WorldCombat.effect(electrifyPayload, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value.all !== 0 && value.all !== 1) throw new Error("Invalid electrify payload");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(electrifyPayload, "start", function () { });
    WorldCombat.effectHandler(electrifyPayload, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function electrifyAllows(world: CombatWorld, actor: CombatActor, type: string): boolean {
        const views = world.effects(actor, electrifyPayload);
        const all = views.length ? !!JSON.parse(String(views[0].data())).all : false;
        return all ? type !== "Electric" : type === "Normal";
    }
    function electrifyRelease(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, electrifyPayload);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }

    // 属性改写点：带电者出招，结算前把有效属性改成电。
    PokemonDamage.metadata.define({ id: "world_combat:move_electrify/convert", apply: function (context) {
        if (!context.world || !context.actor) return;
        if (context.metadata.type === "Electric") return;
        if (!CombatStatus.has(context.world, context.actor, "electrify")) return;
        if (!electrifyAllows(context.world, context.actor, context.metadata.type)) return;
        context.metadata.type = "Electric";
    } });

    // 兑现点：电属性伤害落地，电荷爆开用掉。
    NativeEffects.incomingRules.define({ id: "world_combat:move_electrify/discharge", apply: function (hit) {
        const data = hit.data;
        if (!data || data.kind !== "move" || data.type !== "Electric") return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source)) return;
        if (MobEffects.consume(world, source, electrified) === null) return;
        electrifyRelease(world, source);
        const body = world.observe(source);
        if (body === null) return;
        const power = typeof data.power === "number" && isFinite(data.power) ? data.power : 0;
        const surge = Math.max(1, Math.min(3, power / 40));
        WorldFeedback.emit(world, electrifyScene, 1, body.position(),
            { moment: "discharge", target: String(source.ref()), surge: surge, burst: Math.round(20 * surge) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), electrifySpentText, [], 22);
    } });

    // 持电：每 20 刻续一次身上的电弧；电荷没了就不播。
    WorldCombat.on("world_combat:move_electrify/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== electrified || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, electrified) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_electrify/linger/" + String(actor.ref()), electrifyScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });

    // 自散：没等到出招就用完时间，电荷安静褪去。
    WorldCombat.on("world_combat:move_electrify/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== electrified || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        electrifyRelease(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, electrifyScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 20);
    });
}
