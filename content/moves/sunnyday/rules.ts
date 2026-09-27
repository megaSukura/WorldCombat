/**
 * 大晴天 / sunnyday 的烈日区规则与属性结算，对所有战斗者一致。
 *
 * 烈日区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:sunnyday_sunlit`
 * （身份 `world_combat:status/sunlit`）；冻结被晒化，身上的水（共享身份 soaked，无论谁施加）被蒸干。
 *
 * 火 / 水倍率不凭余温标记，而是读该活体**当前位置当前有效的语义天气**：`WorldEnvironment.weather`
 * 取覆盖该点、最新发布且未结束的天气贡献。异源晴雨重叠时只有最新的一方生效，不会晴 ×1.5 与雨 ×1.5
 * 叠成两种相反的增伤；离开烈日区或烈日被更新的天气覆盖后，加成随覆盖失效。晴天余温只作为可被读取的
 * 身份留存。招式可在伤害元数据中声明自己的天气倍率；未声明的使用当地天气的属性倍率。
 * 属性改写放在 `PokemonDamage.metadata`，结算前生效，改完再进入本系、相性与特性。
 * 雨与晴互相替换，由 skill.ts 在提交后处理。
 */
namespace PokemonSkills {
    function sunnyPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function sunnyWarm(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        var body = world.observe(actor);
        if (body === null) return false;
        // 只有当地天气真的有效为烈日时才补晴暖：被更新的异源天气覆盖时不刷新状态与烘干，状态、光圈与覆盖一致。
        if (!WorldEnvironment.isWeather(world, body.position(), "sun")) return false;
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
        return true;
    }

    WorldEffects.fieldRule(sunnyField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!sunnyWarm(world, actor, field)) return;
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
            // 当前有效天气仍是烈日时铺满；被更新的异源天气覆盖时局部环收束、变淡，恢复来源后再亮。
            var effective = WorldEnvironment.isWeather(world, centre, "sun");
            WorldFeedback.keep(world, "world_combat:move_sunnyday/field/" + effect.id(), sunnyScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: (effective ? 1 : 0.55) * field.radius / 9,
                  intensity: effective ? 1 : 0.5 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("sun"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("sun")] });

    PokemonDamage.metadata.define({ id: "world_combat:move_sunnyday/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        var body = context.world.observe(context.actor);
        if (body === null) return;
        if (!WorldEnvironment.isWeather(context.world, body.position(), "sun")) return;
        var type = String(context.metadata.type).toLowerCase();
        context.metadata.power *= PokemonDamage.weatherMultiplier(context.metadata, "sun", type === "fire" ? 1.5 : type === "water" ? .5 : 1);
    } });
}
