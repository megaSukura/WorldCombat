/**
 * 戏法空间 / trickroom 的区域规则与速度倒转，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:trickroom_shift`
 * （身份 `world_combat:status/trickroom`），并把这片空间的「基准速度」与「扭转幅度」记在本单元的成员表里。
 * 移动速度在 `world_combat:navigate` 上改写：以基准为轴把该活体的有效速度取反——慢于基准的被推快、
 * 快于基准的被拖慢。宝可梦读原生速度与速度等级（含世界修正），其他生物读公共速度等级，一条路径覆盖所有对象。
 * 双方平等：谁在空间里谁被扭，走出去立刻恢复，空间结束整片复原。
 */
namespace PokemonSkills {
    /** 成员表：空间里的活体 → 本条空间的基准速度与扭转幅度；导航事件按它计算倒转倍数。 */
    var trickRoomSpin: { [ref: string]: { reference: number; depth: number } } = Object.create(null);

    function trickRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function trickRoomRemaining(world: CombatWorld, field: WorldEffects.Field): number {
        const until = Number(field.data.until);
        return isFinite(until) ? Math.max(20, Math.round(until - world.tick())) : 200;
    }
    function trickRoomRule(field: WorldEffects.Field): { reference: number; depth: number } {
        const reference = Number(field.data.reference), depth = Number(field.data.depth);
        return { reference: isFinite(reference) && reference > 0 ? reference : 90,
            depth: isFinite(depth) && depth > 0.15 && depth <= 1 ? depth : 0.5 };
    }
    /** 有效速度：宝可梦读原生速度 × 速度等级倍率；其他生物读公共速度等级。 */
    function trickRoomSpeed(world: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
            return Math.max(1, NativeEffects.stat(pokemon, state, "spe")) * NativeEffects.multiplier(NativeEffects.stage(state, "spe"));
        }
        return 100 * CombatStages.multiplier(CombatStages.stage(world, actor, "spe"));
    }

    WorldEffects.fieldRule(trickRoomField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const remaining = trickRoomRemaining(world, field), spin = trickRoomRule(field);
            MobEffects.apply(world, actor, trickRoomShift, remaining, 0);
            trickRoomSpin[String(actor.ref())] = spin;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, trickRoomScene, 1, body.position(),
                { moment: "flip", target: String(actor.ref()), reference: spin.reference, depth: spin.depth,
                    density: Number(field.data.density) || 24 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), trickRoomFlipText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            MobEffects.apply(world, actor, trickRoomShift, trickRoomRemaining(world, field), 0);
            const key = String(actor.ref());
            if (!trickRoomSpin[key]) trickRoomSpin[key] = trickRoomRule(field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const key = String(actor.ref());
            MobEffects.consume(world, actor, trickRoomShift);
            delete trickRoomSpin[key];
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, trickRoomScene, 1, body.position(), { moment: "unflip", target: key }, 18);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_trickroom/field/" + effect.id(), trickRoomScene, 1, trickRoomPoint(field),
                { moment: "inside", density: Number(field.data.density) || 24, depth: Number(field.data.depth) || 0.5,
                    scale: field.radius / 3.6 }, 20);
        }
    });

    // 速度倒转：在场上按「基准 / 有效速度」改写移动速度，慢的变快、快的变慢。
    // 只对带上本空间身份（trickRoomSpin 里有记录）的活体生效；根须、睡眠一类把速度压到 0 的不动。
    WorldCombat.on("world_combat:move_trickroom/turn", "world_combat:navigate", "cobblemon_world_combat:navigate", function (event) {
        const world = event.world(), actor = event.actor(), spin = trickRoomSpin[String(actor.ref())];
        if (!spin) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.speed > 0)) return;
        const speed = trickRoomSpeed(world, actor);
        if (!(speed > 0)) return;
        const factor = Math.max(spin.depth, Math.min(1 / spin.depth, spin.reference / speed));
        data.speed = Math.max(0, Math.min(3, data.speed * factor));
        event.data(JSON.stringify(data));
    });
}
