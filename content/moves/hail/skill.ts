/**
 * 冰雹 / hail 的出手方式。
 *
 * 念头的形状：施法者抬手把上空的水汽冻住（windup：头顶凝起一层白霜预告）→ 冰柱崩落、雹子在落点砸开
 * （burst）→ 除冰属性外，幕里的活体被一趟趟砸掉生命、身上的冷气凝成白霜（field / pelt / coat）→ 雹停，
 * 地表留下砸碎的冰（settle / 碎冰到期）。
 * 三幕：凝霜 → 崩雹 → 砸击与留冰。
 *
 * 提交前只播预告；雹区（WorldEffects.field）与碎冰（world.terrain）都在提交后写。雹区是租借效果，
 * 到期自己结束；碎冰用 linger 活过雹区本身。冰属性免疫按原生属性在 rules.ts 里判定。
 */
namespace PokemonSkills {
    define({
        id: "hail",
        name: "冰雹",
        description: "把上空的水汽冻成硬雹砸下来：除冰属性外，雹区里的活体被一趟趟砸掉生命，碎冰在落地处留在地表一段时间；冰属性的身体只被冷气裹上白霜。",
        uses: ["压制没有冰之护体的对手", "把成群的敌人砸在雹区里", "在交战区留下冻硬的碎冰"],
        kind: "point",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "hail",
        defaults: { squall: false },
        fields: [flag("squall", "暴风冰雹")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("hail", "stormRadius", pokemon) : 9, geometry: "area", style: "hail",
                color: 0xBFE9FF, label: config && config.squall ? "暴风冰雹" : "细密冰雹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["hail"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const squall = !!(config && config.squall);
            return {
                prepare: Math.max(4, Math.round(p("hail", "gather", context))),
                recover: Math.max(4, Math.round(p("hail", "settle", context))),
                cooldown: Math.max(40, p("hail", "cooldown", context) + (squall ? 16 : -10)),
                active: skills["hail"].active,
                range: p("hail", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hail:windup", hailScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("hail", "stormRadius", action), squall: config && config.squall ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
            const radius = p("hail", "stormRadius", action);
            const ticks = Math.max(120, Math.round(p("hail", "stormTicks", action)));
            const struck = Math.round(p("hail", "struckTicks", action));
            const density = Math.round(p("hail", "stoneDensity", action));
            const pelt = Math.max(0.01, Math.min(0.2, p("hail", "pelt", action)));
            const interval = Math.max(30, Math.round(p("hail", "stoneInterval", action)));
            const shards = Math.max(4, Math.round(p("hail", "shardCells", action)));
            const shardTicks = Math.max(80, Math.round(ticks * 0.6));
            WorldEnvironment.replaceOwnWeather(world, actor);
            WorldEffects.field(world, hailField, point, radius,
                { struck: struck, density: density, pelt: pelt, interval: interval, shards: shards,
                    shardTicks: shardTicks, seeded: false, next: 0 }, ticks);
            world.sound("cobblemon:impact.ice", point, 32, "{}");
            WorldFeedback.emit(world, hailScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 9, density: density, shards: shards, ticks: ticks }, 48);
            done(action);
        }
    });
}
