/**
 * 玩泥巴 / mudsport 的泥滩规则与电招结算，对所有战斗者一致。
 *
 * 泥滩是一条区域规则：每 5 刻扫描半径内的活体，只有**真实脚底踩在泥面上**（`WorldEffects.groundedContact`）的
 * 才补 `world_combat:mudsport_coat`（身份 `world_combat:status/mudsport` 是本招的机读键；`world_combat:status/mud`
 * 是共享的「糊泥」身份，别的单元可以只问糊没糊）。该效果本身带 −15% 移动速度修饰，所以踩进泥里的活体移动变慢；
 * 使出的电属性招式威力再乘上泥滩写下的 factor，结算前在 `PokemonDamage.metadata` 里改写。
 * 离地（飞起/跳起）或走出泥滩、泥滩消失，立即撤掉这一份贡献，糊泥与减速随即结束，不留余泥。
 * 范围只由薄泥面表现，不替换地表方块。敌友同一套规则。
 */
namespace PokemonSkills {
    StatusContributions.define(mudsportCoat);
    function mudsportSurface(world: CombatWorld, tile: number[]): boolean {
        const support = SurfacePaths.support(world, WorldCombat.point(tile[0], tile[1], tile[2]), 0.1, 0.1);
        return support !== null && Math.abs(support.y() - tile[1]) < 0.05;
    }
    function mudsportContact(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field | WorldEffects.Area): boolean {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        const low = body.boundsMin(), high = body.boundsMax(), tiles: number[][] = field.data.surfaces || [];
        return tiles.some(tile => Math.abs(low.y() - tile[1]) < 0.15 && low.x() < tile[0] + 0.5 && high.x() > tile[0] - 0.5
            && low.z() < tile[2] + 0.5 && high.z() > tile[2] - 0.5 && mudsportSurface(world, tile));
    }
    function mudsportPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 一份仍与泥滩同寿命的糊泥贡献；离开/离地由调用方立即移除。 */
    function mudsportApplyCoat(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ticks = Math.max(1, Math.round(Number(field.remaining) || 1)) + 2;
        StatusContributions.upsert(world, actor, mudsportCoat, String(field.id), { factor: field.data.factor }, ticks,
            { owner: { id: field.id!, definition: "world_combat:field", target: String(world.source().ref()) } });
    }
    function mudsportCoatVisual(world: CombatWorld, actor: CombatActor, body: CombatObservation, field: WorldEffects.Field): void {
        WorldFeedback.emit(world, mudsportScene, 1, body.position(),
            { moment: "coat", target: String(actor.ref()), density: field.data.density || 20, factor: field.data.factor, scale: 1 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mudsportCoatText, [], 22);
    }
    /** 只有真实接地才算踩上泥面；接地状态改变时才补/撤本场的贡献，避免每 5 刻重复触发画面。 */
    function mudsportTouch(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const marks = field.data.grounded || (field.data.grounded = {});
        const ref = String(actor.ref());
        if (mudsportContact(world, actor, field)) {
            mudsportApplyCoat(world, actor, field);
            if (marks[ref] !== true) { marks[ref] = true; mudsportCoatVisual(world, actor, body, field); }
        } else if (marks[ref] === true) {
            marks[ref] = false;
            StatusContributions.remove(world, actor, mudsportCoat, String(field.id));
        }
    }

    WorldEffects.fieldRule(mudsportField, {
        accepts: mudsportContact,
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            mudsportTouch(world, actor, field);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            mudsportTouch(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const marks = field.data.grounded;
            if (marks) delete marks[String(actor.ref())];
            StatusContributions.remove(world, actor, mudsportCoat, String(field.id));
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const tiles: number[][] = field.data.surfaces || [];
            for (let i = 0; i < tiles.length; i++) {
                const tile = tiles[i], data: any = { moment: "main", rate: Math.max(0.2, (field.data.cover || 10) / tiles.length) };
                if (!mudsportSurface(world, tile)) data.lifecycle = { reason: "surface-left", tick: world.tick() };
                WorldFeedback.onEffect(world, effect.id(), "world_combat:mudsport/tile/" + i, "world_combat:move_mudsport/tile", 1,
                    WorldCombat.point(tile[0], tile[1] + 0.035, tile[2]), data);
            }
        }
    });

    // 糊泥者的电招被压：只有带 mudsport 身份的来源受影响，威力乘上泥滩写下的 factor。
    PokemonDamage.metadata.define({ id: "world_combat:move_mudsport/dampen", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "electric") return;
        const fields = WorldEffects.areas(context.world, mudsportField).filter(field => !field.pending
            && WorldEffects.covers(context.world!, field, context.actor!) && mudsportContact(context.world!, context.actor!, field));
        let factor = 1;
        for (let i = 0; i < fields.length; i++) {
            const value = Number(fields[i].data.factor);
            if (isFinite(value) && value > 0 && value < factor) factor = value;
        }
        context.metadata.power *= factor;
    } });
}
