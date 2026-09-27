/**
 * 连斩层数的生命周期，对所有战斗者一致。
 *
 * `world_combat:furycutter_momentum` 只借共享身份 `world_combat:status/furycutter`，行为全部在这里写：
 *   - 换招打断：任何不是连斩的招式**实际提交成功后**（`world_combat:committed`）层数才清零；
 *     准备被取消、提交被拒绝都不消耗连击（原生「连续命中」的另一半）。
 *   - 刃上聚气：由真实层数载体自身的托管效果 `world_combat:furycutter_aura` 拥有，用无限时长 moment 持续，
 *     层数几层就多密多亮；它不靠固定时长续期，也不再逐 20 刻补一次。
 *   - 统一收尾：载体因自然到期、牛奶、/effect clear、换招或脚本移除等任何原因消失时，聚气托管效果随之结束，
 *     `presentOn` 的表现一起释放，再按原因播一次散锋/褪去。
 */
namespace PokemonSkills {
    /** 聚气托管效果的核心：只要层数载体还在就持续维持（streak 为无限 moment），载体一消失就安静结束。 */
    function furycutterAuraWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target();
        const body = world.valid(actor) ? world.observe(actor) : null;
        if (body === null || MobEffects.read(world, actor, furycutterMomentum) === null) { effect.end(); return; }
        const stage = furycutterStage(world, actor);
        WorldFeedback.onEffect(world, effect.id(), furycutterAuraKey, furycutterScene, 1, body.position(),
            { moment: "streak", stage: stage + 1, cuts: Math.pow(2, stage), aura: 0.06 + stage * 0.03 });
        effect.schedule("watch", "watch", 10, "{}");
    }

    WorldCombat.effect(furycutterAura, 1, 2400, "actor", function () { return "{}"; }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(furycutterAura, "start", furycutterAuraWatch);
    WorldCombat.effectHandler(furycutterAura, "watch", furycutterAuraWatch);
    WorldCombat.effectHandler(furycutterAura, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 确保 actor 身上有一条本单元的聚气托管效果（source 即 actor，presentOn 归它所有），返回其 id。 */
    export function furycutterAuraHold(world: CombatWorld, actor: CombatActor): number {
        const views = world.effects(actor, furycutterAura);
        for (let i = 0; i < views.length; i++)
            if (String(views[i].source().ref()) === String(actor.ref())) return views[i].id();
        return world.effect(furycutterAura, actor, "{}", 2400);
    }

    /** 载体结束的统一收尾：结束聚气托管效果（presentOn 释放）并按原因播散锋/褪去。 */
    function furycutterAuraEnd(world: CombatWorld, actor: CombatActor, cause: string): void {
        world.effects(actor, furycutterAura).forEach(function (view) {
            if (String(view.source().ref()) === String(actor.ref())) world.operation(view.id(), "world_combat:dispel", "{}");
        });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, furycutterScene, 1, body.position(),
            { moment: cause === "expired" ? "fade" : "drop" }, 22);
    }

    // 载体加入或升层：确保聚气托管效果在场（恢复/重载后也在此补回）。
    WorldCombat.on("world_combat:move_furycutter/held", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== furycutterMomentum) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        furycutterAuraHold(world, actor);
    });

    // 载体移除（任何原因）：统一收掉聚气，并按原因收尾（过期安静褪去，其余算被打断）。
    WorldCombat.on("world_combat:move_furycutter/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== furycutterMomentum) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 升层时是「先移除再以更高振幅重挂」，移除事件后载体已经回来：这是刷新，不是结束。
        if (MobEffects.read(world, actor, furycutterMomentum) !== null) return;
        furycutterAuraEnd(world, actor, String(data.cause));
    });

    // 换招打断：只有不是连斩的招式实际提交成功后才清层；准备被取消、提交被拒绝都不消耗连击。
    MobEffects.react("world_combat:move_furycutter/break", furycutterMomentum, "world_combat:committed",
        function (event) { return event.actor(); },
        function (event, actor, state) {
            const action = event.action();
            if (action !== null && String(action.content()) === "world_combat:" + furycutterId) return;
            event.world().removeMobEffect(actor, state.id(), state.key());
        });
}
