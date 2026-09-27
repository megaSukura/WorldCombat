/**
 * 冷笑话 / chillyreception 的雪区规则，对所有战斗者一致。
 *
 * 雪区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:chillyreception_snow`
 * （共享身份 `world_combat:status/snow`，和雪景共用同一个「正在下雪」的机读键）。雪景的防御加成属于雪景，
 * 冷笑话只借身份、不加防御：它的作用在出手那一下——冷场、一次短打断、退开，雪只是留在原地的那部分。
 *
 * 表现分两层：整片雪场只挂在实际 field 效果上（onEffect，带真实半径），随雪区一起收；某个成员刚踏进来时
 * 只在他身上点几片小雪花，不再各画一整片。冷场的身份与打断在 skill.ts 结算。
 */
namespace PokemonSkills {
    function chillyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function chillyLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ticks = Math.max(40, Math.round(Number(field.data.hush) || 50)) + 20;
        MobEffects.apply(world, actor, chillySnow, ticks, 0);
    }

    WorldEffects.fieldRule(chillyField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            chillyLay(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, chillyScene, 1, body.position(),
                { moment: "enter", target: String(actor.ref()), density: field.data.density || 26 }, 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            chillyLay(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (field.data.bound) return;
            field.data.bound = true;
            // 整片雪场挂在实际 field 效果上，半径按世界格直接绑给画面。
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_chillyreception/field", chillyScene, 1, chillyPoint(field),
                { moment: "field", density: field.data.density || 26, radius: field.radius });
        }
    }, { identity: WorldEnvironment.weatherTag("snow"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("snow")] });
}
