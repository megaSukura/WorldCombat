/**
 * 毒瓦斯 / poisongas 的出手方式。
 *
 * 念头的形状：朝选定的点吐出一股瓦斯（windup → exhale），瓦斯落地摊成一片低垂的云（cloud）；
 * 云罩住谁，谁就中毒，站在里面毒素一直被维持，走出云外按自己的时间走完。
 * 云还有一种结局：云里有人带着灼伤、或云下压着火／岩浆，整片云被点着（ignite），
 * 里面的人同时吃一记火属性爆燃并被烧伤，之外的人只看见云变成火云（burncloud）。
 * 两幕加一个分支：exhale → cloud →（被点着）ignite/burncloud。
 *
 * 云由共享的场地机制 `WorldEffects.field` 承担，规则 `world_combat:field/poisoncloud` 定义在本单元；
 * 中毒与灼伤都走共享身份，宝可梦那一层由共享默认效果同步成原生异常。
 */
namespace PokemonSkills {
    const poisongasScene = "world_combat:move_poisongas";
    const poisongasField = "world_combat:field/poisoncloud";
    const poisongasCloudText = "world_combat.move.poisongas.text.cloud";
    const poisongasPoisonText = "world_combat.move.poisongas.text.poisoned";
    const poisongasIgniteText = "world_combat.move.poisongas.text.ignite";

    function poisongasCenter(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 云里是否出现火源：有人带着灼伤，或云下有火／岩浆。逐格取样并覆盖中心，控制开销。 */
    function poisongasBurning(world: CombatWorld, centre: CombatPoint, radius: number): boolean {
        var actors = world.query(centre, radius, false);
        for (var i = 0; i < actors.length; i++) if (world.valid(actors[i]) && CombatStatus.has(world, actors[i], "burn")) return true;
        var r = Math.ceil(radius);
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            for (var dy = -1; dy <= 1; dy++) {
                var block = world.block(WorldCombat.point(centre.x() + dx, centre.y() + dy, centre.z() + dz));
                if (block === null) continue;
                var id = String(block.id());
                if (id === "minecraft:fire" || id === "minecraft:soul_fire" || id === "minecraft:lava") return true;
            }
        }
        return false;
    }

    /** 云被点着：对云内所有非友方结算一记火属性爆燃并点着，然后播放爆燃。 */
    function poisongasBlast(world: CombatWorld, field: WorldEffects.Field, centre: CombatPoint, radius: number): void {
        var actors = world.query(centre, radius, false), hits = 0;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (!world.valid(actor) || world.friendly(actor)) continue;
            var body = world.observe(actor);
            if (body === null) continue;
            hurt(world, actor, "poisongas", field.data.blast, { damage: damageSpec("poisongas", "blast"), type: "fire" });
            if (world.valid(actor)) CombatStatus.inflict(world, actor, "burn", field.data.burn);
            hits++;
        }
        var scale = radius / 2.4;
        WorldFeedback.emit(world, poisongasScene, 1, centre, { moment: "ignite", scale: scale,
            count: 26 + hits * 6, size: 0.3 + scale * 0.16, speed: 0.26 + scale * 0.12 }, 34);
        WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.8, 0)), poisongasIgniteText, [], 30);
        world.sound("minecraft:entity.generic.explode", centre, 24, "{}");
    }

    /** 一个身处云中的战斗者：按当前状态上毒或上火，并按 refresh 节流，避免每 5 刻重掷一次。 */
    function poisongasExpose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): boolean {
        if (world.friendly(actor)) return false;
        var ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return false;
        var first = next[ref] === undefined;
        next[ref] = now + Math.max(10, Math.round(field.data.refresh || 40));
        var body = world.observe(actor);
        if (field.data.burning) {
            CombatStatus.inflict(world, actor, "burn", field.data.burn);
            if (body !== null) WorldFeedback.emit(world, poisongasScene, 1, body.position(), { moment: "burning", target: ref }, 20);
        } else {
            CombatStatus.inflict(world, actor, "poison", field.data.poison);
            if (body !== null) {
                WorldFeedback.emit(world, poisongasScene, 1, body.position(), { moment: "poisoned", target: ref }, 20);
                if (first) WorldFeedback.text(world, body.position(), poisongasPoisonText, [], 24);
            }
        }
        return true;
    }

    // 云的行为：维持画面、按节流上毒、检测火源并爆燃。规则登记一次，全场共用。
    WorldEffects.fieldRule(poisongasField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.poison === "number")) return;
            var centre = poisongasCenter(field), radius = field.radius;
            if (!field.data.burning && poisongasBurning(world, centre, radius)) {
                field.data.burning = true;
                poisongasBlast(world, field, centre, radius);
            }
            var scale = radius / 2.4;
            WorldFeedback.keep(world, "poisongas:cloud", poisongasScene, 1, centre,
                { moment: field.data.burning ? "burncloud" : "cloud", scale: scale, burning: field.data.burning ? 1 : 0 }, 40);
            var actors = world.query(centre, radius, false), applied = 0, cap = Math.max(1, Math.round(field.data.maxTargets || 4));
            for (var i = 0; i < actors.length && applied < cap; i++) {
                var actor = actors[i];
                if (!world.valid(actor)) continue;
                var body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                if (poisongasExpose(world, actor, field, false)) applied++;
            }
        }
    });

    define({
        id: "poisongas",
        name: "Poison Gas",
        description: "A cloud of poison gas is sprayed in the faces of opposing Pokemon, poisoning those it hits.",
        uses: ["封住一条通道或门口", "一次罩住几个挤在一起的目标", "把火种丢进毒云做成爆燃"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 12,
        active: 60,
        recover: 10,
        cooldown: 60,
        style: "gas",
        defaults: { dense: false, ai: { maxChase: 9, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["poisongas"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("poisongas", "prepare", context),
                recover: p("poisongas", "recover", context),
                cooldown: p("poisongas", "cooldown", context),
                range: p("poisongas", "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["poisongas"], detail: { values: config } };
            return { radius: p("poisongas", "cloudRadius", context), geometry: "area", style: "gas", label: "毒瓦斯" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_poisongas:windup", poisongasScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition();
            const origin = action.origin();
            const radius = p("poisongas", "cloudRadius", action);
            const ticks = p("poisongas", "cloudTicks", action);
            const scale = radius / 2.4;
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            sound(action, "cobblemon:move.poisongas.actor");
            WorldFeedback.emit(world, poisongasScene, 1, origin, { moment: "exhale",
                direction: [direction.x(), direction.y(), direction.z()], distance: distance, scale: scale }, 34);
            WorldEffects.field(world, poisongasField, centre, radius, {
                poison: p("poisongas", "poisonTicks", action),
                burn: p("poisongas", "burnTicks", action),
                blast: p("poisongas", "blast", action),
                refresh: 40,
                maxTargets: Math.max(1, Math.round(p("poisongas", "maxTargets", action))),
                next: {}, burning: false
            }, ticks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.8, 0)), poisongasCloudText, [], 30);
            sound(action, "cobblemon:move.poisongas.target");
            done(action);
        }
    });
}
