/**
 * 奇妙空间 / wonderroom 的区域规则与攻防对调，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体。只有同时具有防御与特防两条通道的活体
 * （宝可梦，或注册了 stats.def/spd 的 Mod 生物）才被标记并真正交换；单通道的原版生物只是
 * 从场边经过，不会得到「已交换」的假反馈。真正的对调写在共享伤害事实读取器上：带共享身份
 * `world_combat:status/wonderroom` 的活体，两条通道接反。双方平等：谁在空间里谁被换，
 * 走出去换回，空间结束整片复原。
 */
namespace PokemonSkills {
    function wonderRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function wonderRoomRemaining(world: CombatWorld, field: WorldEffects.Field): number {
        const until = Number(field.data.until);
        return isFinite(until) ? Math.max(20, Math.round(until - world.tick())) : 200;
    }

    // 同时具有两条防御通道才可交换；缺任一条保持原样，不标记、不显示成功。
    function wonderRoomChannels(world: CombatWorld, actor: CombatActor): { def: number; spd: number } | null {
        const facts = PokemonDamage.combatants.read(world, actor);
        const def = facts.stats.def, spd = facts.stats.spd;
        if (typeof def !== "number" || !isFinite(def) || typeof spd !== "number" || !isFinite(spd)) return null;
        return { def: def, spd: spd };
    }
    // 盾纹粗细直接由实际前后强弱换算；服务端完成单位换算与限幅，粒子只按结果发射。
    function wonderRoomThickness(value: number): number {
        return Math.max(0.1, Math.min(0.6, value / 200));
    }
    // 仍被同规则的另一片空间罩住时不收回，避免重叠空间互相拆台。
    function wonderRoomCovered(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const areas = WorldEffects.areas(world, wonderRoomField);
        for (let i = 0; i < areas.length; i++) {
            if (areas[i].id === field.id) continue;
            const centre = WorldCombat.point(areas[i].position[0], areas[i].position[1], areas[i].position[2]);
            if (body.position().minus(centre).length() <= areas[i].radius) return true;
        }
        return false;
    }

    WorldEffects.fieldRule(wonderRoomField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const channels = wonderRoomChannels(world, actor), body = world.observe(actor);
            if (channels === null) {
                // 单通道：只从场边经过，不出现成功纹，也不加身份。
                if (body !== null) WorldFeedback.emit(world, wonderRoomScene, 1, body.position(),
                    { moment: "pass", target: String(actor.ref()) }, 14);
                return;
            }
            MobEffects.apply(world, actor, wonderRoomSwap, wonderRoomRemaining(world, field), 0);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomScene, 1, body.position(), { moment: "swap", target: String(actor.ref()),
                density: Number(field.data.density) || 22, def: channels.def, spd: channels.spd,
                defThickness: wonderRoomThickness(channels.def), spdThickness: wonderRoomThickness(channels.spd) }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), wonderRoomSwapText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (CombatStatus.has(world, actor, wonderRoomStatus))
                MobEffects.apply(world, actor, wonderRoomSwap, wonderRoomRemaining(world, field), 0);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!CombatStatus.has(world, actor, wonderRoomStatus)) return;
            if (wonderRoomCovered(world, actor, field)) return;
            MobEffects.consume(world, actor, wonderRoomSwap);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomScene, 1, body.position(), { moment: "unswap", target: String(actor.ref()) }, 18);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_wonderroom/field/" + effect.id(), wonderRoomScene, 1,
                wonderRoomPoint(field), { moment: "inside", density: Number(field.data.density) || 22, scale: field.radius / 3.4 });
        }
    });

    // 对调兑现点：带空间身份的活体，防御与特防两条通道互换。
    // 该读取器是所有伤害与公式读防御／特防的同一入口，所以命中结算与说明看到的是同一份数字；
    // 没有这对属性的生物不获得身份，也就不受影响。
    PokemonDamage.combatants.provide("world_combat:move_wonderroom/swap", function (context: CombatantStats.Context, facts: CombatantStats.Facts): void {
        if (!CombatStatus.has(context.world, context.actor, wonderRoomStatus)) return;
        const def = facts.stats.def, spd = facts.stats.spd;
        if (def === undefined || spd === undefined) return;
        facts.stats.def = spd; facts.stats.spd = def;
    });
}
