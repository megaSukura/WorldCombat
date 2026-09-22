/**
 * 冰雹 / hail 的雹区规则与砸击结算，对所有战斗者一致。
 *
 * 雹区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:hail_struck`
 * （共享身份 `world_combat:status/hail`，只借身份、不带共享行为）。冰属性免疫砸击、只被冷气裹住；
 * 其余每 stoneInterval 刻被砸掉 pelt 比例的最大生命。首趟扫描把落地砸碎的冰租借到地面上
 * （world.terrain，linger 让它活过雹区本身）。雹区不改招式威力，只改生命与地面。
 */
namespace PokemonSkills {
    function hailPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 冰之躯不受冰雹砸击；无属性者照单全收。 */
    export function hailImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("ice") >= 0;
    }

    /** 首趟把砸碎的冰租借到地表：逐列找地表，在它上面放一格冰。 */
    function hailShards(world: CombatWorld, field: WorldEffects.Field): number {
        const centre = hailPoint(field), budget = Math.max(4, Math.round(Number(field.data.shards) || 16));
        const life = Math.max(60, Math.round(Number(field.data.shardTicks) || 200));
        const base = Math.floor(centre.y());
        let placed = 0, attempts = 0;
        while (placed < budget && attempts < budget * 4) {
            attempts++;
            const angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius * 0.92;
            const x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            for (let dy = 3; dy >= -3; dy--) {
                const ground = world.block(WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5));
                if (ground === null) continue;
                const id = String(ground.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id === "minecraft:ice" || id === "minecraft:packed_ice" || id === "minecraft:blue_ice" || id === "minecraft:snow_block") break;
                try {
                    world.terrain(JSON.stringify({ cells: [{ x: x, y: base + dy + 1, z: z, block: "minecraft:ice" }], replace: true, linger: true }), life);
                    placed++;
                } catch (error) { }
                break;
            }
        }
        return placed;
    }

    function hailPelt(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const amount = Math.max(1, Math.floor(body.maxHealth() * (Number(field.data.pelt) || 0.0625)));
        const dealt = -world.health(actor, -amount, "world_combat:hail");
        WorldFeedback.emit(world, hailScene, 1, body.position(),
            { moment: "pelt", target: String(actor.ref()), damage: Math.round(dealt * 10) / 10, stones: Math.max(8, Math.round(6 + dealt * 1.5)),
                density: field.data.density || 30, scale: field.radius / 9 }, 20);
    }

    function hailLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ticks = Math.max(40, Math.round(Number(field.data.struck) || 80)) + 20;
        MobEffects.apply(world, actor, hailMark, ticks, 0);
    }

    WorldEffects.fieldRule(hailField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            hailLay(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            if (hailImmune(world, actor)) {
                WorldFeedback.emit(world, hailScene, 1, body.position(), { moment: "coat", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailCoatText, [], 22);
                return;
            }
            WorldFeedback.emit(world, hailScene, 1, body.position(),
                { moment: "pelt", target: String(actor.ref()), density: field.data.density || 30, scale: field.radius / 9 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), hailPeltText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            hailLay(world, actor, field);
            if (!field.data.pulse) return;
            if (hailImmune(world, actor)) return;
            hailPelt(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = hailPoint(field);
            if (!field.data.seeded) {
                field.data.seeded = true;
                field.data.placed = hailShards(world, field);
            }
            const interval = Math.max(10, Math.round(Number(field.data.interval) || 70));
            const now = world.tick();
            if (!(Number(field.data.next) > 0)) field.data.next = now + interval;
            field.data.pulse = now >= Number(field.data.next);
            if (field.data.pulse) field.data.next = now + interval;
            WorldFeedback.keep(world, "world_combat:move_hail/field/" + effect.id(), hailScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: field.radius / 9, shards: field.data.shards || 18 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("hail"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("hail")] });
}
