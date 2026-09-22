/**
 * 大晴天 / sunnyday 的烈日区规则与属性结算，对所有战斗者一致。
 *
 * 烈日区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:sunnyday_sunlit`
 * （身份 `world_combat:status/sunlit`）。带 sunlit 的活体：火属性招式威力 ×1.5、水属性招式 ×0.5；
 * 冻结被晒化，身上的水（共享身份 soaked，无论谁施加）被蒸干。属性改写放在 `PokemonDamage.metadata`，
 * 结算前对任何来源的招式生效，改完再进入本系、相性与特性。雨与晴互相替换，由 skill.ts 在提交后处理。
 */
namespace PokemonSkills {
    function sunnyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function sunnyWarm(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        var body = world.observe(actor);
        if (body === null) return;
        var ticks = Math.max(40, Math.round(Number(field.data.lit) || 80)) + 20;
        MobEffects.apply(world, actor, sunnyMark, ticks, 0);
        if (CombatStatus.has(world, actor, "frozen")) {
            CombatStatus.cure(world, actor, "frozen");
            WorldFeedback.emit(world, sunnyScene, 1, body.position(), { moment: "thaw", target: String(actor.ref()) }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sunnyThawText, [], 26);
        }
        if (CombatStatus.has(world, actor, "soaked")) {
            MobEffects.consumeTagged(world, actor, StatusVocabulary.tag("soaked"));
            WorldFeedback.emit(world, sunnyScene, 1, body.position(), { moment: "dry", target: String(actor.ref()) }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sunnyDryText, [], 24);
        }
    }

    WorldEffects.fieldRule(sunnyField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sunnyWarm(world, actor, field);
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, sunnyScene, 1, body.position(),
                { moment: "sunlit", target: String(actor.ref()), density: field.data.density || 30 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sunnyLitText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sunnyWarm(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = sunnyPoint(field);
            WorldFeedback.keep(world, "world_combat:move_sunnyday/field/" + effect.id(), sunnyScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: field.radius / 9 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("sun"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("sun")] });

    PokemonDamage.metadata.define({ id: "world_combat:move_sunnyday/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (!CombatStatus.has(context.world, context.actor, "sunlit")) return;
        var type = String(context.metadata.type).toLowerCase();
        if (type === "fire") context.metadata.power *= 1.5;
        else if (type === "water") context.metadata.power *= 0.5;
    } });
}
