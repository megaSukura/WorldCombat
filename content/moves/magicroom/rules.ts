/**
 * 魔法空间 / magicroom 的区域规则与装备压制，对所有战斗者一致。
 *
 * 空间是一条区域规则：每 5 刻扫描半径内的活体，给他们补共享身份 world_combat:status/magicroom
 * 的 MobEffect（本单元效果 world_combat:magicroom_gag）。成员归属按「空间实例」跟踪——每个空间
 * 为自己的覆盖对象维护一份 StatusContributions 贡献（WorldEffects.membership），重叠的两片空间
 * 各算各的：离开一片、仍被另一片覆盖时不会解除。
 *
 * 装备压制落到每个成员一份「接收者投影」（world_combat:move_magicroom/holder）。投影在成员带
 * 共享身份期间存在，自己在 action/effect 拥有者作用域里调用 world.suppressEquipment，暂停原生
 * vanilla 装备槽 ItemStack 声明的属性增益；宝可梦再叠加 NativeModifiers.suppressItems 层（owner
 * 绑定投影），于是读取持有物的结算读到「没有携带物」。投影的持续视觉用 onEffect 挂在自己身上，
 * 成员离圈／空间结束时投影随之收场，宿主按拥有者释放压制并恢复当前真实装备。装备、附魔与天生属性
 * 都不移动、不销毁。第三方自定义槽位与任意主动脚本能力不在此契约内。
 */
namespace PokemonSkills {
    const magicRoomMaximum = 1200000;
    const magicRoomScan = 5;

    function magicRoomPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    // 成员归属：每个空间实例一条独立贡献；carrier 只在这些贡献都消失后才被收回。
    WorldEffects.membership(magicRoomField, magicRoomGag, {
        ticks: function (field: WorldEffects.Field): number { return Math.max(1, Math.round(field.remaining || 1)); }
    });

    // 接收者投影：状态只存当前真实压制的件数，供离圈回亮时按事实播报。
    WorldCombat.effect(magicRoomHolder, 1, magicRoomMaximum, "actor", function (json) {
        const value = JSON.parse(json);
        if (!value || typeof value.count !== "number" || !isFinite(value.count) || value.count < 0) throw new Error("Invalid magicroom holder");
        return JSON.stringify(value);
    }, function () { throw new Error("Magicroom holder cannot migrate"); });

    function magicRoomHolderView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, magicRoomHolder);
        return views.length ? views[0] : null;
    }
    function magicRoomLayerTicks(world: CombatWorld, actor: CombatActor): number {
        const mark = MobEffects.read(world, actor, magicRoomGag);
        if (mark === null) return 20;
        return mark.duration() < 0 ? magicRoomMaximum : Math.max(20, Math.min(magicRoomMaximum, mark.duration()));
    }
    /** 投影内真实压制：原生装备槽的属性贡献 + 宝可梦携带物效果；返回真正被压制的件数。 */
    function magicRoomPress(world: CombatWorld, actor: CombatActor, projection: number): number {
        let pieces = world.suppressEquipment(actor);
        if (String(actor.domain()) === "cobblemon" && NativeItems.heldOf(world, actor) !== null) {
            const layers = NativeModifiers.read(world, actor);
            if (!layers.suppressItems) NativeModifiers.apply(world, actor, { suppressItems: true, source: magicRoomId,
                owner: { actor: String(actor.ref()), definition: magicRoomHolder, id: projection } }, magicRoomLayerTicks(world, actor));
            pieces += 1;
        }
        return isFinite(pieces) ? Math.max(0, Math.round(pieces)) : 0;
    }
    /** carrier 仍在就续上自己的时钟；不在就收场（离圈或空间结束）。 */
    function magicRoomHolderAlive(effect: CombatEffect): boolean {
        const world = effect.world(), target = effect.target();
        const mark = world.valid(target) ? MobEffects.read(world, target, magicRoomGag) : null;
        if (mark === null) { effect.end(); return false; }
        effect.remaining(mark.duration() < 0 ? magicRoomMaximum : Math.max(1, Math.min(magicRoomMaximum, mark.duration())));
        return true;
    }
    function magicRoomHolderPulse(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target(), state = JSON.parse(String(effect.state()));
        const before = state.count, count = magicRoomPress(world, target, effect.id());
        if (count !== state.count) { state.count = count; effect.state(JSON.stringify(state)); }
        const body = world.observe(target);
        if (body === null) return;
        // 只在「从无到有」时通报一次，避免每 5 刻重复刷屏。
        if (before <= 0 && count > 0) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), magicRoomGagText, [count], 22);
        // 件数降到 0 也照发一次，让同 key 的持续符纹立刻停画。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_magicroom/seal", magicRoomSealScene, 1, body.position(),
            { moment: "seal", count: count, target: String(target.ref()),
                scale: Math.max(0.5, Math.min(2, body.width() / 0.9)) });
    }
    WorldCombat.effectHandler(magicRoomHolder, "start", function (effect) {
        if (!magicRoomHolderAlive(effect)) return;
        magicRoomHolderPulse(effect); effect.schedule("watch", "watch", magicRoomScan, "{}");
    });
    WorldCombat.effectHandler(magicRoomHolder, "watch", function (effect) {
        if (!magicRoomHolderAlive(effect)) return;
        magicRoomHolderPulse(effect); effect.schedule("watch", "watch", magicRoomScan, "{}");
    });
    WorldCombat.effectHandler(magicRoomHolder, "end", function (effect) {
        const state = JSON.parse(String(effect.state()));
        if (!(state.count > 0)) return;
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) return;
        // 离圈／空间结束：道具微光落回，用一次清晰回亮读作「压制解除」。
        WorldFeedback.emit(world, magicRoomScene, 1, body.position(), { moment: "chip", target: String(target.ref()) }, 18);
    });
    WorldCombat.effectHandler(magicRoomHolder, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 场地层：扫描时维持两人都看得见的边界与稀疏方格；进入／持续时确保每名成员有一份投影。
    WorldEffects.fieldRules.define({ id: "world_combat:move_magicroom/members", apply: function (context) {
        const world = context.world, field = context.field, actor = context.actor;
        if (context.phase === "scan") {
            const id = field.id === undefined ? 0 : field.id;
            if (id <= 0) return;
            const point = magicRoomPoint(field), scale = field.radius / magicRoomReferenceRadius;
            WorldFeedback.onEffect(world, id, "world_combat:move_magicroom/area/" + id, magicRoomScene, 1, point,
                { moment: "inside", density: Number(field.data.density) || 22, scale: scale });
            WorldFeedback.onEffect(world, id, "world_combat:move_magicroom/grid/" + id, magicRoomGridScene, 1, point,
                { moment: "grid", radius: field.radius, scale: scale });
            return;
        }
        if (actor === null || (context.phase !== "enter" && context.phase !== "stay")) return;
        if (magicRoomHolderView(world, actor) !== null) return;
        const mark = MobEffects.read(world, actor, magicRoomGag);
        const ticks = mark === null ? Math.max(1, Math.round(field.remaining || 1))
            : (mark.duration() < 0 ? magicRoomMaximum : Math.max(1, mark.duration()));
        world.effect(magicRoomHolder, actor, JSON.stringify({ count: 0 }), ticks);
    } });
}
