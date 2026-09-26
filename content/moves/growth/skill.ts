/** 生长：阳光增强双攻提升；真实身体增长由独立体型窗口维护。 */
namespace PokemonSkills {
    const growthScene = "world_combat:move_growth";
    const growthText = "world_combat.move.growth.text.grown";
    const growthSunText = "world_combat.move.growth.text.sunfed";
    /** 表现里的参考半径：`data.scale = 实际绿环半径 / 这个数`。 */
    const growthReferenceRadius = 2.4;

    define({
        id: "growth",
        cooldownParameter: "wait",
        name: "Growth",
        description: "提升自身攻击与特攻，阳光会增强提升。身体暂时长大，狭窄空间会限制体型增长，但仍能获得双攻提升。",
        uses: ["开场先长一轮，把双攻垫起来", "在阳光下翻倍长一次"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "verdant",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["growth"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("growth", "tempo", context)),
                recover: Math.round(p("growth", "aftercast", context)),
                cooldown: Math.round(p("growth", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_growth:gather", growthScene, 1, action.origin(),
                JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const atk = Math.max(1, Math.min(2, Math.round(p("growth", "atkGift", action))));
            const spa = Math.max(1, Math.min(2, Math.round(p("growth", "spaGift", action))));
            const spread = Math.max(1.2, Math.min(5, p("growth", "spread", action)));
            const blades = Math.max(6, Math.round(p("growth", "blades", action)));
            const window = Math.max(80, Math.round(p("growth", "grownTicks", action)));
            const scale = spread / growthReferenceRadius;
            const actualAtk = NativeEffects.boost(world, actor, "atk", atk);
            const actualSpa = NativeEffects.boost(world, actor, "spa", spa);
            growBody(world, actor, p("growth", "bodyGain", action), window);
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const sun = sunlight(world, body.position()) >= growthSunlight;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "swell", actor: String(actor.ref()), scale: scale, blades: blades,
                    gift: atk + spa, sun: sun ? 1 : 0, sunGold: sun ? blades : 0, reach: spread,
                    intensity: Math.max(0.8, Math.min(2, (atk + spa) / 2)) }, 34);
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "sprout", actor: String(actor.ref()), scale: scale, blades: blades, sun: sun ? 1 : 0 }, 30);
            WorldFeedback.emit(world, growthScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), scale: scale, blades: blades }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                sun ? growthSunText : growthText, [actualAtk > 0 ? "+" + actualAtk : String(actualAtk), actualSpa > 0 ? "+" + actualSpa : String(actualSpa)], 34);
            world.sound(sun ? "minecraft:block.moss.place" : "minecraft:item.bone_meal.use", body.position(), 16, "{}");
            done(action);
        }
    });
}
