/**
 * 求雨 / raindance 的雨区规则与属性结算，对所有战斗者一致。
 *
 * 雨区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:raindance_soaked`
 * （身份 `world_combat:status/rained` 是本招的机读键，`world_combat:status/soaked` 是共享的“湿”身份，
 * 别的单元可以只问湿没湿）。带 rained 的活体：水属性招式威力 ×1.5、火属性招式 ×0.5；身上的火被浇灭、
 * 灼伤被治愈（`cause = expired` 的自然痊愈走共享路径，这里是用雨浇灭）。
 * 雨区每轮还按 quench 预算检查地面格，把野火 `breakBlock` 掉——火是消耗品，灭掉就不会自己烧回来。
 * 属性改写放在 `PokemonDamage.metadata`，结算前对任何来源的招式生效，改完再进入本系、相性与特性。
 */
namespace PokemonSkills {
    function raindancePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function raindanceWet(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        var body = world.observe(actor);
        if (body === null) return;
        var ticks = Math.max(40, Math.round(Number(field.data.soaked) || 80)) + 20;
        MobEffects.apply(world, actor, raindanceMark, ticks, 0);
        if (!CombatStatus.has(world, actor, "burn")) return;
        CombatStatus.cure(world, actor, "burn");
        world.ignite(actor, 0);
        WorldFeedback.emit(world, raindanceScene, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), raindanceDouseText, [], 26);
    }

    /** Bounded cell walk: each scan checks a few ground cells inside the rain and puts out any open fire. */
    function raindanceQuench(world: CombatWorld, field: WorldEffects.Field): void {
        var centre = raindancePoint(field), budget = Math.max(1, Math.round(Number(field.data.quench) || 6));
        var base = Math.floor(centre.y());
        for (var i = 0; i < budget; i++) {
            var angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius;
            var x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            for (var dy = -1; dy <= 1; dy++) {
                var point = WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5), block = world.block(point);
                if (block === null) continue;
                var id = String(block.id());
                if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") continue;
                if (world.breakBlock(point, false) !== "") continue;
                WorldFeedback.emit(world, raindanceScene, 1, point, { moment: "douse" }, 20);
                break;
            }
        }
    }

    WorldEffects.fieldRule(raindanceField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            raindanceWet(world, actor, field);
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, raindanceScene, 1, body.position(),
                { moment: "drench", target: String(actor.ref()), density: field.data.density || 30 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), raindanceDrenchText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            raindanceWet(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = raindancePoint(field);
            WorldFeedback.keep(world, "world_combat:move_raindance/field/" + effect.id(), raindanceScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: field.radius / 9 }, 20);
            raindanceQuench(world, field);
        }
    }, { identity: WorldEnvironment.weatherTag("rain"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("rain")] });

    PokemonDamage.metadata.define({ id: "world_combat:move_raindance/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (!CombatStatus.has(context.world, context.actor, "rained")) return;
        var type = String(context.metadata.type).toLowerCase();
        if (type === "water") context.metadata.power *= 1.5;
        else if (type === "fire") context.metadata.power *= 0.5;
    } });
}
