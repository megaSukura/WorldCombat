/** 生长：提升自身双攻，阳光增强提升；绿环和草叶表现身体抽长。 */
namespace PokemonSkills {
    const growthScene = "world_combat:move_growth";
    const growthGrown = "world_combat:grown";
    const growthText = "world_combat.move.growth.text.grown";
    const growthSunText = "world_combat.move.growth.text.sunfed";
    /** 表现里的参考半径：`data.scale = 实际绿环半径 / 这个数`。 */
    const growthReferenceRadius = 2.4;

    define({
        id: "growth",
        name: "Growth",
        description: "让身体一下子长大，把攻击与特攻一起抬起来；站在阳光下这一下翻倍，绿环与草叶随身体向外展开。",
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
            NativeEffects.boost(world, actor, "atk", atk);
            NativeEffects.boost(world, actor, "spa", spa);
            MobEffects.apply(world, actor, growthGrown, window, 0);
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
                sun ? growthSunText : growthText, [atk, spa], 34);
            world.sound(sun ? "minecraft:block.moss.place" : "minecraft:item.bone_meal.use", body.position(), 16, "{}");
            done(action);
        }
    });
}
