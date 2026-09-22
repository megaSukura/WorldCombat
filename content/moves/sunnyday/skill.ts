/**
 * 大晴天 / sunnyday 的出手方式。
 *
 * 念头的形状：施法者把云拨开、仰头把太阳“请”下来（windup：头顶聚起一圈暖光）→ 天空转晴，
 * 落点压下一柱日光、张开一片烈日区（burst）→ 区里的活体被晒暖，火招更猛水招被晒弱，
 * 冻结化开、身上的水被蒸干（field / sunlit / thaw / dry）→ 烈日西斜、余温散去（field 到期）。
 * 三幕：起手 → 晴天 → 晒暖与蒸干。
 *
 * 提交前只播预告；`world.weather("clear")` 与烈日区都在提交后写。施放时先把施法者自己名下的
 * 天候场地收掉（新天候替换旧天候），再铺新的。烈日区是租借效果，到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: "sunnyday",
        name: "大晴天",
        description: "把烈日叫到选定的那片天：天空转晴，烈日区里的火属性招式威力提高、水属性招式被晒弱，冻结化开、身上的水被蒸干。雨与晴互相替换。",
        uses: ["给火属性招式加成", "压制水属性对手", "解冻与烘干"],
        kind: "point",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "sun",
        defaults: { blazing: false },
        fields: [flag("blazing", "烈日当空")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("sunnyday", "sunRadius", pokemon) : 9, geometry: "area", style: "sun",
                label: config && config.blazing ? "烈日当空" : "温阳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["sunnyday"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const blazing = !!(config && config.blazing);
            return {
                prepare: Math.max(4, Math.round(p("sunnyday", "gather", context))),
                recover: Math.max(4, Math.round(p("sunnyday", "settle", context))),
                cooldown: Math.max(40, p("sunnyday", "cooldown", context) + (blazing ? 18 : -12)),
                active: skills["sunnyday"].active,
                range: p("sunnyday", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sunnyday:windup", sunnyScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("sunnyday", "sunRadius", action), blazing: config && config.blazing ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
            const radius = p("sunnyday", "sunRadius", action);
            const ticks = Math.max(120, Math.round(p("sunnyday", "sunTicks", action)));
            const lit = Math.round(p("sunnyday", "sunlitTicks", action));
            const density = Math.round(p("sunnyday", "sunDensity", action));
            WorldEnvironment.replaceOwnWeather(world, actor);
            world.weather("clear", ticks);
            WorldEffects.field(world, sunnyField, point, radius,
                { lit: lit, density: density, sky: "clear" }, ticks);
            world.sound("minecraft:block.beacon.activate", point, 32, "{}");
            WorldFeedback.emit(world, sunnyScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 9, density: density, ticks: ticks }, 48);
            done(action);
        }
    });
}
