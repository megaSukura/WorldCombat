/**
 * 雪景 / snowscape 的出手方式。
 *
 * 念头的形状：施法者慢慢呼出一口白气（windup：嘴边浮起细霜预告）→ 雪在落点静静落下、铺开成一片雪区
 * （burst）→ 雪区的冰之躯绷紧身体、防御提高，露天的水面被冻成冰，雪一直铺到地表（field / crisp / lock / cover）
 * → 雪停，地表那层雪还在（雪区到期）。
 * 三幕：呼气 → 落雪 → 覆雪与冻水。
 *
 * 提交前只播预告；雪区（WorldEffects.field）与地表雪／冰（world.terrain）都在提交后写。雪区是租借效果，
 * 到期自己结束；地表的雪与冰用 linger 活过雪区本身。雪景不造成伤害，只改地面与冰之躯的防御。
 */
namespace PokemonSkills {
    define({
        id: "snowscape",
        name: "雪景",
        description: "在选定的地面上落下一场安静的雪：雪覆盖地表、露天的水面被冻成冰，雪区里的冰属性身体把防御绷高一级；不造成伤害。",
        uses: ["在交战区铺开雪地并以冻水改变走动", "增强冰之躯的防御", "为随后的冰招与走位准备地形"],
        kind: "point",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "snow",
        defaults: { deep: false },
        fields: [flag("deep", "厚覆之雪")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("snowscape", "snowRadius", pokemon) : 10, geometry: "area", style: "snow",
                color: 0xEAF6FF, label: config && config.deep ? "厚覆之雪" : "薄雪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["snowscape"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.max(4, Math.round(p("snowscape", "gather", context))),
                recover: Math.max(4, Math.round(p("snowscape", "settle", context))),
                cooldown: Math.max(40, p("snowscape", "cooldown", context) + (deep ? 14 : -10)),
                active: skills["snowscape"].active,
                range: p("snowscape", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_snowscape:windup", snowscapeScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("snowscape", "snowRadius", action), deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
            const radius = p("snowscape", "snowRadius", action);
            const ticks = Math.max(120, Math.round(p("snowscape", "snowTicks", action)));
            const powder = Math.round(p("snowscape", "powderTicks", action));
            const density = Math.round(p("snowscape", "flakeDensity", action));
            const cover = Math.max(6, Math.round(p("snowscape", "coverCells", action)));
            const freeze = Math.max(1, Math.round(p("snowscape", "freezeCells", action)));
            const groundTicks = Math.max(80, Math.round(ticks * 0.7));
            WorldEnvironment.replaceOwnWeather(world, actor);
            WorldEffects.field(world, snowscapeField, point, radius,
                { powder: powder, density: density, cover: cover, freeze: freeze, groundTicks: groundTicks,
                    seeded: false }, ticks);
            world.sound("minecraft:block.snow.place", point, 24, "{}");
            WorldFeedback.emit(world, snowscapeScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 10, density: density, cover: cover, freeze: freeze, ticks: ticks }, 44);
            done(action);
        }
    });
}
