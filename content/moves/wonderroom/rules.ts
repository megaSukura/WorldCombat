/**
 * 奇妙空间 / wonderroom 的区域规则与攻防对调，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:wonderroom_swap`
 * （身份 `world_combat:status/wonderroom`）。真正的对调写在共享伤害事实读取器上：凡是读取该活体
 * 防御／特防的结算（PokemonDamage 的命中、说明与其他公式）都从这里读，带身份者两条通道接反。
 * 双方平等：谁在空间里谁被换，走出去立刻换回，空间结束整片复原。
 */
namespace PokemonSkills {
    function wonderRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function wonderRoomRemaining(world: CombatWorld, field: WorldEffects.Field): number {
        const until = Number(field.data.until);
        return isFinite(until) ? Math.max(20, Math.round(until - world.tick())) : 200;
    }

    WorldEffects.fieldRule(wonderRoomField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            MobEffects.apply(world, actor, wonderRoomSwap, wonderRoomRemaining(world, field), 0);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomScene, 1, body.position(), { moment: "swap", target: String(actor.ref()),
                density: Number(field.data.density) || 22 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), wonderRoomSwapText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            MobEffects.apply(world, actor, wonderRoomSwap, wonderRoomRemaining(world, field), 0);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            MobEffects.consume(world, actor, wonderRoomSwap);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomScene, 1, body.position(), { moment: "unswap", target: String(actor.ref()) }, 18);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_wonderroom/field/" + effect.id(), wonderRoomScene, 1, wonderRoomPoint(field),
                { moment: "inside", density: Number(field.data.density) || 22, scale: field.radius / 3.4 }, 20);
        }
    });

    // 对调兑现点：带空间身份的活体，防御与特防两条通道互换。
    // 该读取器是所有伤害与公式读防御／特防的同一入口，所以命中结算与说明看到的是同一份数字；
    // 没有这对属性的生物（原版生物）只带身份，不受影响。
    PokemonDamage.combatants.provide("world_combat:move_wonderroom/swap", function (context: CombatantStats.Context, facts: CombatantStats.Facts): void {
        if (!CombatStatus.has(context.world, context.actor, wonderRoomStatus)) return;
        const def = facts.stats.def, spd = facts.stats.spd;
        if (def === undefined || spd === undefined) return;
        facts.stats.def = spd; facts.stats.spd = def;
    });
}
