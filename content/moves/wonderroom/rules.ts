/**
 * 奇妙空间 / wonderroom 的区域规则与攻防对调，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体，只有同时具有防御与特防两条通道的活体
 * （宝可梦，或注册了 stats.def/spd 的 Mod 生物）才被标记并真正交换；单通道的原版生物只是
 * 从场边经过，不会得到「已交换」的假反馈。
 *
 * 成员归属按「空间实例」跟踪：每片空间为自己的覆盖对象维护一份 StatusContributions 贡献
 * （token = field.id），重叠的两片空间各记各的，离开一片、仍被另一片覆盖时不解除；被清除后
 * 只要还站在实际空间里，下一次 stay 就会按场恢复。真正的对调写在共享伤害事实读取器上：
 * 带共享身份 `world_combat:status/wonderroom` 的活体，两条通道接反。
 */
namespace PokemonSkills {
    // 本单元的效果 id 作为 StatusContributions 的 carrier：每片空间记一份 token = field.id 的贡献，
    // carrier 只在所有贡献都消失后才被收回。
    StatusContributions.define(wonderRoomSwap);

    function wonderRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function wonderRoomTicks(field: WorldEffects.Field): number {
        const remaining = Number(field.remaining);
        return isFinite(remaining) && remaining > 0 ? Math.max(1, Math.round(remaining)) : 200;
    }
    function wonderRoomOwner(field: WorldEffects.Field, world: CombatWorld): StatusContributions.Owner {
        return { id: field.id === undefined ? 0 : field.id, definition: "world_combat:field", target: String(world.source().ref()) };
    }
    function wonderRoomToken(field: WorldEffects.Field): string {
        return String(field.id === undefined ? 0 : field.id);
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
    // 按场续一份贡献：enter/stay 都会调用，清标后只要人在场内就恢复，离场只撤本场的 token。
    function wonderRoomContribute(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, channels: { def: number; spd: number }): void {
        StatusContributions.upsert(world, actor, wonderRoomSwap, wonderRoomToken(field), { def: channels.def, spd: channels.spd },
            wonderRoomTicks(field), { owner: wonderRoomOwner(field, world) });
    }

    WorldEffects.fieldRule(wonderRoomField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const channels = wonderRoomChannels(world, actor), body = world.observe(actor);
            if (channels === null) {
                if (body !== null) WorldFeedback.emit(world, wonderRoomScene, 1, body.position(),
                    { moment: "pass", target: String(actor.ref()) }, 14);
                return;
            }
            wonderRoomContribute(world, actor, field, channels);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomExchangeScene, 1, body.position(),
                { moment: "exchange", target: String(actor.ref()), start: world.tick(), duration: 22,
                    density: Number(field.data.density) || 22, def: channels.def, spd: channels.spd,
                    defThickness: wonderRoomThickness(channels.def), spdThickness: wonderRoomThickness(channels.spd) }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), wonderRoomSwapText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const channels = wonderRoomChannels(world, actor);
            if (channels === null) return;
            wonderRoomContribute(world, actor, field, channels);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            StatusContributions.remove(world, actor, wonderRoomSwap, wonderRoomToken(field));
            // 仍被同规则的另一片空间覆盖时，贡献仍在、身份仍亮，不播归位。
            if (CombatStatus.has(world, actor, wonderRoomStatus)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, wonderRoomExchangeScene, 1, body.position(),
                { moment: "exchange", target: String(actor.ref()), start: world.tick(), duration: 18, reverse: true }, 18);
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
