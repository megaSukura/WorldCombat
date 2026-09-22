/**
 * 神奇蒸汽 / strangesteam —— 注册与动作。
 *
 * 核心念头：一柱**会停留的迷幻蒸汽**。施法者朝选定地点喷出一柱滚烫蒸汽，蒸汽在落点散成一片低垂的云；
 * 第一次被喷到的人挨一下烫伤并可能看得恍惚，留在云里会被蒸汽持续熏着、恍惚被不断续上。它是本族唯一
 * 留下一片区域、影响后来者的成员。
 *
 * 三幕：
 *   起（windup，提交前）：气孔里把蒸汽收成一点粉白，只播预告。
 *   喷（jet，提交后）：朝落点喷出一柱蒸汽，蒸汽在落点摊成云（WorldEffects.field）。
 *   熏（cloud，场地规则）：云每 5 刻扫一次；范围内每个非友方第一次被喷到结算 scald 伤害并按 confuseChance
 *       掷迷幻（本单元自己的共享身份载体 world_combat:status/confusion）；留在云里的人被 sear 续熏，恍惚续上。
 */
namespace PokemonSkills {
    function strangesteamCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 只有当代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function strangesteamCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === strangesteamEffect ? effect : null;
    }

    // 云的行为：续播画面；第一次喷到就烫 + 掷迷幻，留下的按节流续熏并续恍惚。规则登记一次，全场共用。
    WorldEffects.fieldRule(strangesteamField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.scald === "number")) return;
            const centre = strangesteamCentre(field), radius = field.radius;
            const scale = radius / 2.6;
            WorldFeedback.keep(world, "strangesteam:cloud", strangesteamScene, 1, centre,
                { moment: "cloud", scale: scale, radius: radius, motes: field.data.motes }, 40);
            const actors = world.query(centre, radius, false);
            const now = world.tick();
            const hit = field.data.hit || (field.data.hit = {});
            const next = field.data.next || (field.data.next = {});
            const refresh = Math.max(20, Math.round(field.data.refresh || 60));
            let applied = 0;
            const cap = Math.max(1, Math.round(field.data.maxTargets || 4));
            for (let i = 0; i < actors.length && applied < cap; i++) {
                const actor = actors[i];
                if (!world.valid(actor) || world.friendly(actor)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                const ref = String(actor.ref());
                if (!hit[ref]) {
                    hit[ref] = true;
                    hurt(world, actor, strangesteamId, field.data.scald, { damage: damageSpec(strangesteamId, "scald") });
                    if (world.valid(actor) && world.random() < field.data.chance)
                        CombatStatus.apply(world, actor, "confusion", strangesteamEffect, field.data.daze, field.data.fumble, { unique: true });
                    WorldFeedback.emit(world, strangesteamScene, 1, body.position(),
                        { moment: "hit", target: ref, motes: field.data.motes, scale: scale }, 24);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), strangesteamDazeText, [], 26);
                } else if (now >= (next[ref] || 0)) {
                    next[ref] = now + refresh;
                    hurt(world, actor, strangesteamId, field.data.sear, { damage: damageSpec(strangesteamId, "sear") });
                    if (world.valid(actor))
                        CombatStatus.apply(world, actor, "confusion", strangesteamEffect, field.data.daze, field.data.fumble, { unique: true });
                    WorldFeedback.emit(world, strangesteamScene, 1, body.position(),
                        { moment: "sear", target: ref, motes: field.data.motes, scale: scale }, 20);
                }
                applied++;
            }
        }
    });

    define({
        id: strangesteamId,
        name: "Strange Steam",
        description: "朝选定地点喷出一柱迷幻蒸汽，蒸汽在落点摊成一片低垂的云：云里第一次被喷到的人挨一记烫伤并可能迷得恍惚；留在云里会被持续熏着，恍惚被不断续上。",
        uses: ["封住一个落点或门口", "一次罩住几个挤在一起的敌人", "用停留的云持续压制进出的人"],
        kind: "point",
        range: 8,
        maxRange: 13,
        prepare: 12,
        active: 1,
        recover: 9,
        cooldown: 30,
        style: "fairy",
        defaults: { dense: false, ai: { maxChase: 12, crowd: true, finish: true } },
        fields: [flag("dense", "浓雾")],
        indicator: function (config, pokemon) {
            const dense = config && config.dense === true;
            return { radius: Math.round(p(strangesteamId, "radius", pokemon) * (dense ? 1.3 : 0.85) * 100) / 100,
                geometry: "area", style: "fairy", color: 0xE89AC8, label: dense ? "神奇蒸汽·浓雾" : "神奇蒸汽·喷发" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[strangesteamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(strangesteamId, "tempo", context)),
                recover: Math.round(p(strangesteamId, "aftercast", context)),
                cooldown: Math.round(p(strangesteamId, "recharge", context)),
                active: 1,
                range: p(strangesteamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:strangesteam:windup", strangesteamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", dense: config && config.dense === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition(), origin = action.origin();
            const dense = !!(config && config.dense === true);
            const baseRadius = p(strangesteamId, "radius", action);
            const radius = Math.max(1.2, Math.min(4.2, Math.round(baseRadius * (dense ? 1.3 : 0.85) * 100) / 100));
            const ticks = Math.max(80, Math.round(p(strangesteamId, "cloudTicks", action)));
            const scale = radius / 2.6;
            const motes = Math.max(14, Math.round(p(strangesteamId, "motes", action)));
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            sound(action, "minecraft:block.fire.extinguish");
            WorldFeedback.emit(world, strangesteamScene, 1, origin,
                { moment: "jet", direction: [direction.x(), direction.y(), direction.z()], distance: distance,
                    motes: motes, scale: scale }, 28);
            WorldEffects.field(world, strangesteamField, centre, radius, {
                scald: p(strangesteamId, "scald", action),
                sear: p(strangesteamId, "sear", action),
                chance: Math.max(0.02, Math.min(0.9, p(strangesteamId, "confuseChance", action))),
                daze: Math.max(40, Math.round(p(strangesteamId, "dazeTicks", action))),
                fumble: Math.round(Math.max(0.05, Math.min(0.9, p(strangesteamId, "fumble", action))) * 100),
                refresh: 60,
                maxTargets: Math.max(1, Math.round(p(strangesteamId, "maxTargets", action))),
                motes: motes, hit: {}, next: {}
            }, ticks);
            WorldFeedback.emit(world, strangesteamScene, 1, centre,
                { moment: "bloom", radius: radius, motes: motes, scale: scale }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), strangesteamCloudText, [], 30);
            sound(action, "minecraft:entity.blaze.shoot");
            done(action);
        }
    });


    // 迷幻存续期：目标身侧持续飘出没散尽的蒸汽，低密度、每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_strangesteam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== strangesteamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "strangesteam:linger:" + String(actor.ref()), strangesteamScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
