/**
 * 魔法空间 / magicroom 的区域规则与道具压制，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:magicroom_gag`
 * （身份 `world_combat:status/magicroom`）。宝可梦成员额外叠加共享的 NativeModifiers `suppressItems` 层，
 * 于是所有读取持有物的结算（NativeEffects.item → 攻击、防御、受伤、机动、特性触发）只读到「没有携带物」。
 * 每名成员记下自己那层的实例 id，走出去或空间结束时主动解除；其他生物只带身份。
 * 双方平等：谁在空间里谁被默，走出去立刻恢复，空间结束整片复原。
 */
namespace PokemonSkills {
    /** 成员表：被静默的活体 → 自己那条 suppressItems 层的实例 id（非宝可梦记 0）。 */
    var magicRoomGags: { [ref: string]: { mod: number } } = Object.create(null);

    function magicRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function magicRoomRemaining(world: CombatWorld, field: WorldEffects.Field): number {
        const until = Number(field.data.until);
        return isFinite(until) ? Math.max(20, Math.round(until - world.tick())) : 200;
    }
    function magicRoomVeil(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const key = String(actor.ref()), remaining = magicRoomRemaining(world, field);
        MobEffects.apply(world, actor, magicRoomGag, remaining, 0);
        if (!magicRoomGags[key]) {
            const mod = String(actor.domain()) === "cobblemon" ? NativeModifiers.apply(world, actor, { suppressItems: true }, remaining) : 0;
            magicRoomGags[key] = { mod: mod };
        }
    }

    WorldEffects.fieldRule(magicRoomField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            magicRoomVeil(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, magicRoomScene, 1, body.position(), { moment: "gag", target: String(actor.ref()),
                density: Number(field.data.density) || 22 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), magicRoomGagText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            magicRoomVeil(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const key = String(actor.ref()), entry = magicRoomGags[key];
            if (entry && entry.mod) world.operation(entry.mod, "world_combat:dispel", "{}");
            delete magicRoomGags[key];
            MobEffects.consume(world, actor, magicRoomGag);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, magicRoomScene, 1, body.position(), { moment: "chip", target: key }, 18);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_magicroom/field/" + effect.id(), magicRoomScene, 1, magicRoomPoint(field),
                { moment: "inside", density: Number(field.data.density) || 22, scale: field.radius / 3.4 }, 20);
        }
    });
}
