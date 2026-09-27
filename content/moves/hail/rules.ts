/**
 * 冰雹 / hail 的雹区规则与砸击结算，对所有战斗者一致。
 *
 * 雹区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:hail_struck`
 * （共享身份 `world_combat:status/hail`，只借身份、不带共享行为）。冰属性免疫砸击、只被冷气裹住；
 * 其余每 stoneInterval 刻被砸掉 pelt 比例的最大生命，但**只有头顶到雹云一路无实心遮挡者才挨砸**：
 * 每趟从头顶朝正上方做一次原生方块射线，取真实接触点；屋檐、岩顶等把它挡住的人这一趟只在屋顶碎，不受伤害。
 * 侧墙不参与——区域成员不再要求对幕心通视。首趟只在雹区地面炸开一片短存碎冰粒子，不铺真方块。
 *
 * 冰资格与砸击都走共享事实：类型用 `PokemonDamage.combatants.read`（普通生物与临时改型一致），
 * 伤害用 `PokemonDamage.residual` 携带天气与原因（kind=residual、indirect=true），原生 hurt、免疫、
 * 护盾与取消照常裁定，不绕过原生事件；进入只覆霜提示，真正的受击火花与浮字由伤害回执在实际接触点播放。
 */
namespace PokemonSkills {
    function hailPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 冰之躯不受冰雹砸击；无属性者照单全收。类型读共享战斗者事实，普通生物与临时改型一致。 */
    export function hailImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        return PokemonDamage.combatants.read(world, actor).types.indexOf("ice") >= 0;
    }

    /**
     * 从头顶朝正上方探一条原生方块射线；有遮挡时返回头顶到真实接触点的世界高度（格），露天返回 0。
     * 只看实际挡住的方块，位置取真实接触点，不写方块格坐标。
     */
    function hailShelter(world: CombatWorld, body: CombatObservation): number {
        const centre = body.position();
        const head = centre.plus(WorldCombat.point(0, body.height() / 2 + 0.2, 0));
        const hit = WorldGeometry.blockHit(world, head, WorldCombat.point(head.x(), head.y() + 24, head.z()));
        if (hit === null) return 0;
        return Math.max(0, Math.round((hit.position().y() - centre.y()) * 10) / 10);
    }

    /** 冰片只做短存表面表现：首趟在雹区地面炸开一片碎冰，不再铺整块冰墙。 */
    function hailShatter(world: CombatWorld, field: WorldEffects.Field): void {
        WorldFeedback.emit(world, hailScene, 1, hailPoint(field),
            { moment: "shatter", density: field.data.density || 30, scale: field.radius / 9 }, 30);
    }

    /** 一趟露天砸击：只提交共享天气残留伤害；受击火花在实际结算的回执里播放。 */
    function hailPelt(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, body: CombatObservation): void {
        const amount = Math.max(1, Math.floor(body.maxHealth() * (Number(field.data.pelt) || 0.0625)));
        PokemonDamage.residual(world, actor, "hail", amount,
            { weather: "hail", reason: "pelt", density: field.data.density || 30, scale: field.radius / 9 });
    }

    // 实际受击才播：雹子先自头上下落，随后在真实接触点炸开，浮字只在真的掉血时出现。
    PokemonDamage.onDamageApplied("world_combat:hail/pelt", function (receipt) {
        if (!(receipt.actual > 0)) return;
        const world = receipt.world, victim = receipt.target, body = world.observe(victim);
        const at = typeof receipt.x === "number" && typeof receipt.y === "number" && typeof receipt.z === "number"
            ? WorldCombat.point(receipt.x, receipt.y, receipt.z) : body === null ? null : body.position();
        if (at === null) return;
        const data = receipt.data;
        const drop = body === null ? 6 : Math.round((body.height() / 2 + 6) * 10) / 10;
        WorldFeedback.emit(world, hailScene, 1, at,
            { moment: "pelt", target: String(victim.ref()), damage: Math.round(receipt.actual * 10) / 10,
                stones: Math.max(8, Math.round(6 + receipt.actual * 1.5)), density: Number(data.density) || 30,
                drop: drop, cover: 0, scale: Number(data.scale) || 1 }, 20);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1, 0)), hailPeltText, [], 22);
    }, { move: "hail", segment: "residual" });

    function hailCoat(world: CombatWorld, actor: CombatActor, body: CombatObservation): void {
        WorldFeedback.emit(world, hailScene, 1, body.position(), { moment: "coat", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailCoatText, [], 22);
    }

    /**
     * 一趟砸击或首次入区：冰之躯只裹霜；头顶有实心顶棚的雹粒在顶棚上碎掉、身体没有受击火花；
     * 露天者才按设计受砸击。`damage` 为 false 时只演不结算（首次入区只覆霜提示）。
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
        else WorldFeedback.emit(world, hailScene, 1, body.position(), { moment: "coat", target: String(actor.ref()) }, 22);
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
