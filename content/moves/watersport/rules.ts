/**
 * 玩水 / watersport 的水洼规则与火焰结算，对所有战斗者一致。
 *
 * 水洼是一条区域规则：每 5 刻扫描半径内的活体，不分敌我地给他们补 world_combat:watersport_soaked
 *   （身份 world_combat:status/watersport 是本招的机读键，world_combat:status/soaked 是共享的「湿」身份，
 *   别的单元可以只问湿没湿）。带 watersport 身份的活体使出的火属性招式威力被乘上水洼写下的 fire：
 *   结算前在 PokemonDamage.metadata 里改写，改完再进入本系、相性与特性；身上的火被浇灭、灼伤被治愈。
 *   水洼每轮还按 quench 预算检查地面格，把野火 breakBlock 掉——火是消耗品，灭掉就不会自己烧回来。
 */
namespace PokemonSkills {
    function watersportPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    function watersportSoak(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ticks = Math.max(40, Math.round(Number(field.data.wet) || 80)) + 20;
        MobEffects.apply(world, actor, watersportEffect, ticks, 0);
        if (CombatStatus.has(world, actor, "burn")) {
            CombatStatus.cure(world, actor, "burn");
            world.ignite(actor, 0);
            WorldFeedback.emit(world, watersportScene, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), watersportDouseText, [], 26);
        }
    }

    /** 有界地走格子：每轮扫描在水洼里取几格，把明火沤熄。 */
    function watersportQuench(world: CombatWorld, field: WorldEffects.Field): void {
        const centre = watersportPoint(field), budget = Math.max(1, Math.round(Number(field.data.quench) || 5));
        const base = Math.floor(centre.y());
        for (let i = 0; i < budget; i++) {
            const angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius;
            const x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            for (let dy = -1; dy <= 1; dy++) {
                const point = WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5), block = world.block(point);
                if (block === null) continue;
                const id = String(block.id());
                if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") continue;
                if (world.breakBlock(point, false) !== "") continue;
                WorldFeedback.emit(world, watersportScene, 1, point, { moment: "douse" }, 20);
                break;
            }
        }
    }

    WorldEffects.fieldRule(watersportField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            watersportSoak(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, watersportScene, 1, body.position(),
                { moment: "drench", target: String(actor.ref()), density: field.data.density || 20, fire: field.data.fire }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), watersportDrenchText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            watersportSoak(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = watersportPoint(field);
            WorldFeedback.keep(world, "world_combat:move_watersport/field/" + effect.id(), watersportScene, 1, centre,
                { moment: "field", density: field.data.density || 20, scale: field.radius / 3.2 }, 20);
            watersportQuench(world, field);
        }
    });

    // 泡湿者的火招被压：只有带 watersport 身份的来源受影响，威力乘上水洼写下的 fire。
    PokemonDamage.metadata.define({ id: "world_combat:move_watersport/dampen", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "fire") return;
        if (!CombatStatus.has(context.world, context.actor, watersportStatus)) return;
        let factor = 0.5;
        const areas = WorldEffects.areas(context.world, watersportField);
        for (let i = 0; i < areas.length; i++) {
            const value = Number(areas[i].data && areas[i].data.fire);
            if (isFinite(value) && value > 0 && value < factor) factor = value;
        }
        context.metadata.power *= factor;
    } });
}
