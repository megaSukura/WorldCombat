/**
 * 求雨 / raindance 的出手方式。
 *
 * 念头的形状：施法者仰头把雨“叫”过来（windup：头顶旋起一小团暗云、落下第一滴雨）→ 天空真的阴下来，
 * 落点张开一片雨区（burst）→ 雨里进出的活体被淋湿，水招更猛火招被压制，身上的火和灼伤被浇灭，
 * 地面正在烧的野火也被雨按格扑灭（field / drench / douse）→ 雨停、水气散去（field 到期）。
 * 三幕：起手 → 落雨 → 淋湿与扑灭。
 *
 * 提交前只播预告；`world.weather` 与雨区都在提交后写。雨区是租借效果（`WorldEffects.field`），
 * 到期自己结束；它跟着施法者离开 48 格会自动收场。天空的雨由 `world.weather` 表达，落点由场决定。
 */
namespace PokemonSkills {
    define({
        id: "raindance",
        name: "求雨",
        description: "把一场雨叫到选定的那片天：雨区里的活体被淋湿，淋湿者的水属性招式威力提高、火属性招式被压低，身上的火与灼伤被浇灭，地面正在烧的野火也被这场雨扑灭。",
        uses: ["给水属性招式加成", "压制火属性对手", "灭火与治愈灼伤"],
        kind: "point",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "rain",
        defaults: { downpour: false },
        fields: [flag("downpour", "倾盆大雨")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("raindance", "stormRadius", pokemon) : 9, geometry: "area", style: "rain",
                label: config && config.downpour ? "倾盆大雨" : "细雨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["raindance"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const downpour = !!(config && config.downpour);
            return {
                prepare: Math.max(4, Math.round(p("raindance", "gather", context))),
                recover: Math.max(4, Math.round(p("raindance", "settle", context))),
                cooldown: Math.max(40, p("raindance", "cooldown", context) + (downpour ? 18 : -12)),
                active: skills["raindance"].active,
                range: p("raindance", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_raindance:windup", raindanceScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("raindance", "stormRadius", action), downpour: config && config.downpour ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
            const radius = p("raindance", "stormRadius", action);
            const ticks = Math.max(120, Math.round(p("raindance", "stormTicks", action)));
            const soaked = Math.round(p("raindance", "soakedTicks", action));
            const density = Math.round(p("raindance", "rainDensity", action));
            const quench = Math.round(p("raindance", "quench", action));
            WorldEnvironment.replaceOwnWeather(world, actor);
            world.weather("rain", ticks);
            WorldEffects.field(world, raindanceField, point, radius,
                { soaked: soaked, density: density, quench: quench, sky: "rain" }, ticks);
            world.sound("minecraft:weather.rain", point, 32, "{}");
            WorldFeedback.emit(world, raindanceScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 9, density: density, ticks: ticks }, 48);
            done(action);
        }
    });
}
