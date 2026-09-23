/**
 * 烟幕 / Smokescreen — 执行组织。
 *
 * 核心念头：朝一个地点吐出一团会停留的烟。烟落地摊成一片低垂的云，谁站在里面谁就打不准；云留在那里，
 *   所以既能铺在对手脚下，也能铺在自己身前挡住视线换一口气——这是全族唯一会留在世界上、影响后来者的成员。
 *
 * 出手：短起手（windup 在口边聚烟）后提交；浓烟与薄烟在覆盖与持久之间取舍。
 * 云：WorldEffects.field 的烟云（规则 world_combat:field/smokescreen 定义在本单元）每 5 刻扫一次，
 *     罩住范围内的非友方，按节流挂共享身份 world_combat:status/smoked，进入时下降原生命中等级。
 * 反制：云有存在时长、不会移动；走出云外余味会自然走完；铺云要选好落点，铺空了就白费一次冷却。
 */
namespace PokemonSkills {
    function smokescreenCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    // 烟云的行为：续播画面、按节流给范围内的非友方上「呛眼」。规则登记一次，全场共用。
    WorldEffects.fieldRule(smokescreenField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.stage === "number")) return;
            const centre = smokescreenCentre(field), radius = field.radius;
            const density = Math.max(20, Math.round(field.data.density || 40));
            const scale = radius / 2.1;
            WorldFeedback.keep(world, "smokescreen:cloud", smokescreenScene, 1, centre,
                { moment: "cloud", scale: scale, density: density, radius: radius }, 40);
            const stage = Math.max(1, Math.round(field.data.stage));
            const linger = Math.max(40, Math.round(field.data.linger || 70));
            const actors = world.query(centre, radius, false);
            const next = field.data.next || (field.data.next = {});
            const now = world.tick();
            for (let i = 0; i < actors.length; i++) {
                const actor = actors[i];
                if (!world.valid(actor) || world.friendly(actor)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                const ref = String(actor.ref());
                if (now < (next[ref] || 0)) continue;
                next[ref] = now + Math.max(10, Math.round(field.data.refresh || 20));
                const fresh = !CombatStatus.has(world, actor, smokescreenSpot);
                MobEffects.apply(world, actor, smokescreenEffect, linger, 0);
                if (fresh) {
                    NativeEffects.boost(world, actor, "accuracy", -stage);
                    WorldFeedback.emit(world, smokescreenScene, 1, body.position(),
                        { moment: "choked", target: ref, stage: stage, density: density }, 28);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.05, 0)),
                        "world_combat.move.smokescreen.text.choke", [stage], 34);
                }
            }
        }
    }, { tags: [WorldEffects.categories.haze] });

    define({
        id: smokescreenId,
        cooldownParameter: "recharge",
        name: "烟幕",
        description: "朝一个地点吐出一片会停留的烟云；站在云里的敌人命中下降、攻击变弱，走出云后还带着一段余味。云留在原地，可以罩住对手，也可以挡在自己身前。",
        uses: ["把对手罩进一片打不准的云里", "铺在身前挡住视线，换一口气或撤退", "封住门口与走廊"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "smoke",
        defaults: { density: "thick" },
        fields: [
            choice("density", "烟量", ["thick", "thin"], ["浓烟", "薄烟"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[smokescreenId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !(config && config.density === "thin");
            return {
                prepare: Math.round(p(smokescreenId, "tempo", context)) + (thick ? 4 : 0),
                recover: p(smokescreenId, "recover", context),
                cooldown: Math.round(p(smokescreenId, "recharge", context) * (thick ? 1.2 : 0.95)),
                active: 1,
                range: p(smokescreenId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("smokescreen-windup", smokescreenScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", density: config && config.density === "thin" ? "thin" : "thick" }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[smokescreenId], detail: { values: config } };
            const thick = !(config && config.density === "thin");
            return { radius: Math.round(p(smokescreenId, "cloudRadius", context) * (thick ? 0.8 : 1.3) * 100) / 100,
                geometry: "area", style: "smoke", color: 0x6E6E78, label: thick ? "烟幕·浓烟" : "烟幕·薄烟" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = action.targetPosition(), origin = action.origin();
            const thick = !(config && config.density === "thin");
            const radius = Math.max(1.3, Math.min(4.2, Math.round(p(smokescreenId, "cloudRadius", action) * (thick ? 0.8 : 1.3) * 100) / 100));
            const ticks = Math.max(80, Math.round(p(smokescreenId, "cloudTicks", action) * (thick ? 1.35 : 0.75)));
            const linger = Math.max(50, Math.round(p(smokescreenId, "lingerTicks", action)));
            const stage = Math.max(1, Math.min(3, Math.round(p(smokescreenId, "blindStage", action))));
            const speed = Math.max(0.6, p(smokescreenId, "smokeSpeed", action));
            const density = Math.max(20, Math.round(p(smokescreenId, "density", action) * (thick ? 1.3 : 0.75)));
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            sound(action, "cobblemon:move.smokescreen.actor");
            WorldFeedback.emit(world, smokescreenScene, 1, origin,
                { moment: "puff", direction: [direction.x(), direction.y(), direction.z()], distance: distance,
                    speed: speed, density: density, scale: radius / 2.1 }, 26);
            WorldEffects.field(world, smokescreenField, centre, radius,
                { stage: stage, linger: linger, density: density, refresh: 20, next: {} }, ticks);
            WorldFeedback.emit(world, smokescreenScene, 1, centre,
                { moment: "bloom", radius: radius, density: density, scale: radius / 2.1 }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)),
                "world_combat.move.smokescreen.text.cloud", [], 28);
            sound(action, "cobblemon:move.smokescreen.target");
            done(action);
        }
    });

    // 呛眼余味存续期间，目标身侧持续飘出没散尽的烟。
    WorldCombat.on("world_combat:move_smokescreen/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== smokescreenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "smokescreen:" + String(actor.ref()), smokescreenScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
