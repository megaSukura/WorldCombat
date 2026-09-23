/**
 * 雪景 / snowscape 的雪区规则与结算，对所有战斗者一致。
 *
 * 雪区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:snowscape_powder`
 * （共享身份 `world_combat:status/snow`，只借身份、不带共享行为）。每片雪区为冰之躯拥有一个防御 +1 的临时窗口，
 * 离场或该雪区结束时只撤销本窗口。首趟扫描把地表盖上一层雪、把露天的水面冻成能站人的冰（world.terrain，linger
 * 让它们活过雪区本身）。雪景不造成伤害，只改地面与冰之躯的防御。
 */
namespace PokemonSkills {
    function snowscapePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    export function snowscapeIce(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        return NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor)).indexOf("ice") >= 0;
    }

    function snowscapeSurface(world: CombatWorld, x: number, baseY: number, z: number): any {
        for (let dy = 3; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(x + 0.5, baseY + dy + 0.5, z + 0.5));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return { y: baseY + dy, id: id };
        }
        return null;
    }

    function snowscapeSoft(id: string): boolean {
        return id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava"
            || id === "minecraft:snow" || id === "minecraft:ice" || id === "minecraft:packed_ice" || id === "minecraft:blue_ice";
    }

    /** 首趟落雪、冻水；返回实际盖住的雪格与冻住的水格。 */
    function snowscapeSeed(world: CombatWorld, field: WorldEffects.Field): { cover: number; ice: number } {
        const centre = snowscapePoint(field), life = Math.max(80, Math.round(Number(field.data.groundTicks) || 240));
        const coverBudget = Math.max(4, Math.round(Number(field.data.cover) || 24));
        const freezeBudget = Math.max(1, Math.round(Number(field.data.freeze) || 4));
        const base = Math.floor(centre.y());
        let cover = 0, ice = 0, attempts = 0;
        while (cover < coverBudget && attempts < coverBudget * 4) {
            attempts++;
            const angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius * 0.92;
            const x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            const surface = snowscapeSurface(world, x, base, z);
            if (surface === null || snowscapeSoft(String(surface.id))) continue;
            try {
                world.terrain(JSON.stringify({ cells: [{ x: x, y: surface.y + 1, z: z, block: "minecraft:snow" }], replace: true, linger: true }), life);
                cover++;
            } catch (error) { }
        }
        attempts = 0;
        while (ice < freezeBudget && attempts < freezeBudget * 8) {
            attempts++;
            const angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius * 0.92;
            const x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            const surface = snowscapeSurface(world, x, base, z);
            if (surface === null || String(surface.id) !== "minecraft:water") continue;
            try {
                world.terrain(JSON.stringify({ cells: [{ x: x, y: surface.y, z: z, block: "minecraft:ice" }], replace: true, linger: true }), life);
                ice++;
            } catch (error) { }
        }
        return { cover: cover, ice: ice };
    }

    function snowscapeLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ticks = Math.max(40, Math.round(Number(field.data.powder) || 90)) + 20;
        MobEffects.apply(world, actor, snowscapeMark, ticks, 0);
    }

    /** One window per field and recipient; removal never writes an inverse stage change into the persistent ladder. */
    function snowscapeClose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const windows = field.data.defenceWindows || {}, ref = String(actor.ref()), id = Number(windows[ref] || 0);
        if (id) NativeEffects.windowClose(world, id);
        delete windows[ref];
    }
    function snowscapeDefence(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        if (!snowscapeIce(world, actor)) { snowscapeClose(world, actor, field); return false; }
        const windows = field.data.defenceWindows || (field.data.defenceWindows = {}), ref = String(actor.ref());
        const existing = Number(windows[ref] || 0);
        if (existing && world.effects(actor, "cobblemon_world_combat:modifier").some(view => view.id() === existing)) return false;
        if (!field.id || !field.remaining) return false;
        const id = NativeEffects.boostWindow(world, actor, { def: 1 }, Math.max(1, Math.round(field.remaining)), "snowscape:" + field.id);
        if (!id) return false;
        const owner: CombatStages.WindowOwner = { actor: String(world.source().ref()), definition: "world_combat:field", id: field.id };
        if (!world.operation(id, "world_combat:stage_owner", JSON.stringify(owner))) { NativeEffects.windowClose(world, id); return false; }
        windows[ref] = id;
        return true;
    }

    WorldEffects.fieldRule(snowscapeField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            snowscapeLay(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            if (snowscapeDefence(world, actor, field)) {
                WorldFeedback.emit(world, snowscapeScene, 1, body.position(), { moment: "crisp", target: String(actor.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), snowscapeCrispText, [], 24);
                return;
            }
            WorldFeedback.emit(world, snowscapeScene, 1, body.position(),
                { moment: "cover", target: String(actor.ref()), density: field.data.density || 30, scale: field.radius / 10 }, 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            snowscapeLay(world, actor, field);
            snowscapeDefence(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            snowscapeClose(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = snowscapePoint(field);
            if (!field.data.seeded) {
                field.data.seeded = true;
                const placed = snowscapeSeed(world, field);
                field.data.placed = placed.cover;
                field.data.frozen = placed.ice;
                if (placed.cover > 0) {
                    WorldFeedback.emit(world, snowscapeScene, 1, centre,
                        { moment: "cover", covers: placed.cover, scale: field.radius / 10 }, 28);
                    WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1, 0)), snowscapeCoverText, [placed.cover], 28);
                }
                if (placed.ice > 0) {
                    WorldFeedback.emit(world, snowscapeScene, 1, centre,
                        { moment: "lock", locks: placed.ice, scale: field.radius / 10 }, 28);
                    WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)), snowscapeLockText, [placed.ice], 28);
                }
            }
            WorldFeedback.keep(world, "world_combat:move_snowscape/field/" + effect.id(), snowscapeScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: field.radius / 10 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("snow"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("snow")] });
}
