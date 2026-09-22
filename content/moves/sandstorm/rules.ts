/**
 * 沙暴 / sandstorm 的沙幕规则与磨蚀结算，对所有战斗者一致。
 *
 * 沙幕是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:sandstorm_swept`
 * （共享身份 `world_combat:status/sandstorm`，只借身份、不带共享行为）。埋身判定按原生属性：
 * 岩石／地面／钢之躯免疫磨蚀，其余每 grainInterval 刻被磨掉 scour 比例的最大生命并被推出 drift 格；
 * 岩石之躯进场时特防 +1 级、离场时收回（NativeEffects.boost，宝可梦走原生等级、其他躯体走公共阶梯）。
 * 首趟扫描把地表磨出的沙粒租借到地面上（world.terrain，linger 让它活过沙幕本身）。
 * 沙幕本身不做招式威力改写：它改的是生命与站位，不是属性相性。
 */
namespace PokemonSkills {
    export function sandstormPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 岩石／地面／钢之躯不受沙暴磨蚀；无属性者（原版生物、玩家）照单全收。 */
    export function sandstormImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("rock") >= 0 || types.indexOf("ground") >= 0 || types.indexOf("steel") >= 0;
    }

    function sandstormRock(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("rock") >= 0;
    }

    /** 首趟把地表磨落的沙租借到地上：逐列找地表，在它上面放一格沙；到期原方块回来。 */
    function sandstormSeed(world: CombatWorld, field: WorldEffects.Field): number {
        const centre = sandstormPoint(field), budget = Math.max(4, Math.round(Number(field.data.cells) || 20));
        const life = Math.max(60, Math.round(Number(field.data.sandTicks) || 200));
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
                if (id === "minecraft:sand" || id === "minecraft:sandstone") break;
                try {
                    // Wind compacts the deposit into a stable crust; the native terrain lease can restore it without dropped sand items.
                    const receipt = JSON.parse(world.terrainResult(JSON.stringify({ cells: [{ x: x, y: base + dy + 1, z: z, block: "minecraft:sandstone" }], replace: true, ground: true, linger: true, bestEffort: true }), life));
                    placed += receipt.placed.length;
                } catch (error) { }
                break;
            }
        }
        return placed;
    }

    /** 一趟磨蚀：掉血、被推出沙幕、带出沙尘。 */
    function sandstormScour(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const amount = Math.max(1, Math.floor(body.maxHealth() * (Number(field.data.scour) || 0.0625)));
        const dealt = -world.health(actor, -amount, "world_combat:sandstorm");
        const drift = Number(field.data.drift) || 0;
        if (drift > 0) {
            const away = body.position().minus(sandstormPoint(field));
            const horizontal = WorldCombat.point(away.x(), 0, away.z());
            const push = horizontal.length() < 0.01 ? WorldCombat.point(1, 0, 0) : horizontal.unit();
            world.displace(actor, push.scale(drift));
        }
        WorldFeedback.emit(world, sandstormScene, 1, body.position(),
            { moment: "scour", target: String(actor.ref()), damage: Math.round(dealt * 10) / 10, grains: Math.max(8, Math.round(6 + dealt * 1.5)),
                density: field.data.density || 30, scale: field.radius / 9 }, 20);
    }

    function sandstormLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ticks = Math.max(40, Math.round(Number(field.data.swept) || 80)) + 20;
        MobEffects.apply(world, actor, sandstormMark, ticks, 0);
    }

    WorldEffects.fieldRule(sandstormField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sandstormLay(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            if (sandstormRock(world, actor)) {
                NativeEffects.boost(world, actor, "spd", 1);
                WorldFeedback.emit(world, sandstormScene, 1, body.position(), { moment: "harden", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sandstormHardenText, [], 22);
                return;
            }
            if (sandstormImmune(world, actor)) {
                WorldFeedback.emit(world, sandstormScene, 1, body.position(), { moment: "grit", target: String(actor.ref()) }, 20);
                return;
            }
            WorldFeedback.emit(world, sandstormScene, 1, body.position(),
                { moment: "scour", target: String(actor.ref()), density: field.data.density || 30, scale: field.radius / 9 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sandstormScourText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sandstormLay(world, actor, field);
            if (!field.data.pulse) return;
            if (sandstormImmune(world, actor)) return;
            sandstormScour(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (sandstormRock(world, actor)) NativeEffects.boost(world, actor, "spd", -1);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = sandstormPoint(field);
            if (!field.data.seeded) {
                field.data.seeded = true;
                field.data.placed = sandstormSeed(world, field);
            }
            const interval = Math.max(10, Math.round(Number(field.data.interval) || 70));
            const now = world.tick();
            if (!(Number(field.data.next) > 0)) field.data.next = now + interval;
            field.data.pulse = now >= Number(field.data.next);
            if (field.data.pulse) field.data.next = now + interval;
            WorldFeedback.keep(world, "world_combat:move_sandstorm/field/" + effect.id(), sandstormScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: field.radius / 9, cards: field.data.cells || 20 }, 20);
        }
    }, { identity: WorldEnvironment.weatherTag("sandstorm"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("sandstorm")] });
}
