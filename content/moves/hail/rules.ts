/**
 * 冰雹 / hail 的雹区规则与砸击结算，对所有战斗者一致。
 *
 * 雹区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:hail_struck`
 * （共享身份 `world_combat:status/hail`，只借身份、不带共享行为）。冰属性免疫砸击、只被冷气裹住；
 * 其余每 stoneInterval 刻被砸掉 pelt 比例的最大生命，但**只有头顶到雹云一路无实心遮挡者才挨砸**：
 * 每趟从身上往正上方探一条原生碰撞射线，屋檐、岩顶等把它挡住的人这一趟只在屋顶碎，不受伤害。
 * 侧墙不参与——区域成员不再要求对幕心通视。首趟只在雹区地面炸开一片短存碎冰粒子，不铺真方块。
 */
namespace PokemonSkills {
    function hailPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 冰之躯不受冰雹砸击；无属性者照单全收。 */
    export function hailImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("ice") >= 0;
    }

    /**
     * 头顶到雹云之间第一块实心遮挡离身体中心多高（格）；正上方露天返回 0。
     * 从头顶每高一格向正上方做一次原生碰撞射线，第一次被挡住的那一格就是屋檐/顶棚。
     */
    function hailShelter(world: CombatWorld, body: CombatObservation): number {
        const head = body.position().plus(WorldCombat.point(0, body.height() / 2 + 0.2, 0));
        for (let step = 1; step <= 24; step++) {
            if (!world.clear(head, WorldCombat.point(head.x(), head.y() + step, head.z())))
                return body.height() / 2 + 0.2 + step;
        }
        return 0;
    }

    /** 冰片只做短存表面表现：首趟在雹区地面炸开一片碎冰，不再铺整块冰墙。 */
    function hailShatter(world: CombatWorld, field: WorldEffects.Field): void {
        WorldFeedback.emit(world, hailScene, 1, hailPoint(field),
            { moment: "shatter", density: field.data.density || 30, scale: field.radius / 9 }, 30);
    }

    function hailPelt(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, body: CombatObservation): void {
        const amount = Math.max(1, Math.floor(body.maxHealth() * (Number(field.data.pelt) || 0.0625)));
        const dealt = -world.health(actor, -amount, "world_combat:hail");
        WorldFeedback.emit(world, hailScene, 1, body.position(),
            { moment: "pelt", target: String(actor.ref()), damage: Math.round(dealt * 10) / 10,
                stones: Math.max(8, Math.round(6 + dealt * 1.5)), density: field.data.density || 30,
                drop: 6, cover: 0, scale: field.radius / 9 }, 20);
    }

    function hailCoat(world: CombatWorld, actor: CombatActor, body: CombatObservation): void {
        WorldFeedback.emit(world, hailScene, 1, body.position(), { moment: "coat", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailCoatText, [], 22);
    }

    /**
     * 一趟砸击或首次入区：冰之躯只裹霜；头顶有实心顶棚的雹粒在顶棚上碎掉、身体没有受击火花；
     * 露天者才按设计受砸击。`damage` 为 false 时只演不结算（首次入区）。
     */
    function hailMoment(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, damage: boolean): void {
        const body = world.observe(actor);
        if (body === null) return;
        if (hailImmune(world, actor)) { if (!damage) hailCoat(world, actor, body); return; }
        const cover = hailShelter(world, body);
        if (cover > 0) {
            WorldFeedback.emit(world, hailScene, 1, body.position(),
                { moment: "cover", target: String(actor.ref()), cover: cover, height: body.height(),
                    density: field.data.density || 30, scale: field.radius / 9 }, 20);
            if (!damage) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailCoverText, [], 22);
            return;
        }
        if (damage) hailPelt(world, actor, field, body);
        else {
            WorldFeedback.emit(world, hailScene, 1, body.position(),
                { moment: "pelt", target: String(actor.ref()), drop: 6, cover: 0,
                    density: field.data.density || 30, scale: field.radius / 9 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailPeltText, [], 22);
        }
    }

    function hailLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ticks = Math.max(40, Math.round(Number(field.data.struck) || 80)) + 20;
        MobEffects.apply(world, actor, hailMark, ticks, 0);
    }

    WorldEffects.fieldRule(hailField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            hailLay(world, actor, field);
            hailMoment(world, actor, field, false);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            hailLay(world, actor, field);
            if (!field.data.pulse) return;
            if (hailImmune(world, actor)) return;
            hailMoment(world, actor, field, true);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!field.data.seeded) {
                field.data.seeded = true;
                hailShatter(world, field);
            }
            const interval = Math.max(10, Math.round(Number(field.data.interval) || 70));
            const now = world.tick();
            if (!(Number(field.data.next) > 0)) field.data.next = now + interval;
            field.data.pulse = now >= Number(field.data.next);
            if (field.data.pulse) field.data.next = now + interval;
            // 持续表现绑在雹区效果自己身上：天然到期、提前驱散或施法者离场时随效果一起收。
            if (!field.data.bound) {
                field.data.bound = true;
                WorldFeedback.onEffect(world, effect.id(), "world_combat:move_hail/field", hailScene, 1, hailPoint(field),
                    { moment: "field", density: field.data.density || 30, scale: field.radius / 9 });
            }
        }
    }, { identity: WorldEnvironment.weatherTag("hail"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("hail")], lineOfSight: false });
}
