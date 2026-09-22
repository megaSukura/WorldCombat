/**
 * 冷笑话 / chillyreception 的雪区规则，对所有战斗者一致。
 *
 * 雪区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:chillyreception_snow`
 * （共享身份 `world_combat:status/snow`，和雪景共用同一个「正在下雪」的机读键）。雪景的防御加成属于雪景，
 * 冷笑话只借身份、不加防御：它的作用在出手那一下——冷场、打断、退开，雪只是留在原地的那部分。
 * 冷场的身份（`world_combat:status/cold_silence`）由 skill.ts 直接落在敌人身上，行为（打断、定身、松仇恨）
 * 也在那里发生；本文件只维护雪区的身份与持续表现。
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
                { moment: "field", target: String(actor.ref()), density: field.data.density || 26, scale: field.radius / 8 }, 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            chillyLay(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_chillyreception/field/" + effect.id(), chillyScene, 1, chillyPoint(field),
                { moment: "field", density: field.data.density || 26, scale: field.radius / 8 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("snow"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("snow")] });
}
