/**
 * 冰雹 / hail 的出手方式。
 *
 * 念头的形状：施法者抬手把上空的水汽冻住（windup：头顶凝起一层白霜预告）→ 冰柱崩落、雹子在落点砸开
 * （burst）→ 除冰属性外，露天的活体被一趟趟砸掉生命、身上的冷气凝成白霜，屋檐下的人只在头顶碎冰
 * （field / pelt / coat / cover）→ 雹停，地表只散去一层短存碎冰粒子（shatter 到期）。
 * 三幕：凝霜 → 崩雹 → 砸击与落地碎冰。
 *
 * 提交前只播预告；雹区（WorldEffects.field）在提交后写，是租借效果、到期自己结束。
 * 冰属性免疫与头顶遮挡按原生属性、原生碰撞射线在 rules.ts 里判定。
 */
namespace PokemonSkills {
    define({
        id: "hail",
        name: "冰雹",
        description: "把上空的水汽冻成硬雹砸下来：除冰属性外，头顶露天的活体被一趟趟砸掉生命，屋檐、岩顶等实心顶棚下的人受保护；冰属性的身体只被冷气裹上白霜。",
        uses: ["压制没有冰之护体的对手", "把成群露天站位的敌人砸在雹区里", "把躲檐的对手晾在露天"],
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
            WorldEnvironment.replaceOwnWeather(world, actor);
            WorldEffects.field(world, hailField, point, radius,
                { struck: struck, density: density, pelt: pelt, interval: interval, seeded: false, next: 0 }, ticks);
            world.sound("cobblemon:impact.ice", point, 32, "{}");
            WorldFeedback.emit(world, hailScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 9, density: density, ticks: ticks }, 48);
            done(action);
        }
    });
}
