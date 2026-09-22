/**
 * 玩泥巴 / mudsport 的泥滩规则与电招结算，对所有战斗者一致。
 *
 * 泥滩是一条区域规则：每 5 刻扫描半径内的活体，给它们补 `world_combat:mudsport_coat`
 *   （身份 `world_combat:status/mudsport` 是本招的机读键；`world_combat:status/mud` 是共享的「糊泥」身份，
 *   别的单元可以只问糊没糊）。带该身份的活体使出的电属性招式威力被乘上泥滩写下的 factor，结算前在
 *   `PokemonDamage.metadata` 里改写。泥滩还把地表方块租借成 `minecraft:mud`，到期原方块回来。
 */
namespace PokemonSkills {
    StatusContributions.define(mudsportCoat);
    function mudsportPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 把落点周围的表层方块换成泥；只动可换的地表，到期原方块回来。 */
    export function mudsportFloor(world: CombatWorld, point: CombatPoint, radius: number, cap: number, ticks: number): number {
        const cells: any[] = [];
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(4, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = baseY + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                if (id !== "minecraft:mud") cells.push({ x: x, y: y, z: z, block: "minecraft:mud" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    function mudsportApplyCoat(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ticks = Math.max(40, Math.round(Number(field.data.coat) || 80)) + 20;
        StatusContributions.upsert(world, actor, mudsportCoat, String(field.id), { factor: field.data.factor }, ticks,
            { owner: { id: field.id!, definition: "world_combat:field", target: String(world.source().ref()) } });
    }

    WorldEffects.fieldRule(mudsportField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            mudsportApplyCoat(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, mudsportScene, 1, body.position(),
                { moment: "coat", target: String(actor.ref()), density: field.data.density || 20, factor: field.data.factor }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), mudsportCoatText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            mudsportApplyCoat(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            StatusContributions.remove(world, actor, mudsportCoat, String(field.id));
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = mudsportPoint(field);
            WorldFeedback.keep(world, "world_combat:move_mudsport/field/" + effect.id(), mudsportScene, 1, centre,
                { moment: "field", density: field.data.density || 20, scale: field.radius / 3.2 }, 20);
        }
    });

    // 糊泥者的电招被压：只有带 mudsport 身份的来源受影响，威力乘上泥滩写下的 factor。
    PokemonDamage.metadata.define({ id: "world_combat:move_mudsport/dampen", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        if (String(context.metadata.type).toLowerCase() !== "electric") return;
        const coats = StatusContributions.list(context.world, context.actor, mudsportCoat);
        if (!coats.length) return;
        let factor = 1;
        for (let i = 0; i < coats.length; i++) {
            const value = Number(coats[i].payload.factor);
            if (isFinite(value) && value > 0 && value < factor) factor = value;
        }
        context.metadata.power *= factor;
    } });
}
