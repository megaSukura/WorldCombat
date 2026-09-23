/**
 * 玩水 / watersport 的出手方式。
 *
 * 念头的形状：施法者把水从身下泼开（windup：脚边泛起水光）→ 落点炸开一圈水环、水贴着地皮铺满一片洼地
 * （splash）→ 站进去的活体——不分敌我——被泡湿，火招被压、身上的火被浇灭，水洼还一格一格沤熄地面明火
 * （field / drench / douse）→ 水渗进土里，湿气散去（field 到期）。
 * 三幕：起手 → 铺水 → 泡湿与沤熄。
 *
 * 提交前只播预告；水洼在提交后铺。水洼是租借效果（`WorldEffects.field`），到期自己结束；
 * 它跟着施法者离开 48 格会自动收场。
 */
namespace PokemonSkills {
    const watersportDeep = flag("deep", "沤湿");
    watersportDeep.help = "沤湿：水洼半径 ×0.75、时长 ×1.35、火招系数 ×0.85（压得更低），代价是起手 +3 刻、冷却 ×1.15。漫开：半径 ×1.3、起手 −2 刻、冷却 ×0.9，代价是时长 ×0.72、火招系数不变。";

    define({
        id: watersportId,
        cooldownParameter: "recharge",
        name: "玩水",
        description: "在选定的地面铺开一汪水：洼里的活体被泡湿，使出的火属性招式被压，身上的火与灼伤被浇灭，地面上的明火也被一格一格沤熄。对双方一视同仁。",
        uses: ["压制火属性对手", "灭火与治愈灼伤", "在火招齐射前先铺湿地面"],
        kind: "point",
        range: 13,
        maxRange: 19,
        prepare: 12,
        active: 0,
        recover: 7,
        cooldown: 140,
        style: "water",
        defaults: { deep: false },
        fields: [watersportDeep],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(watersportId, "puddleRadius", pokemon) : 3.2, geometry: "area", style: "water",
                label: config && config.deep ? "沤湿" : "漫开" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[watersportId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(watersportId, "tempo", context))),
                recover: Math.max(3, Math.round(p(watersportId, "aftercast", context))),
                cooldown: Math.max(60, Math.round(p(watersportId, "recharge", context))),
                range: p(watersportId, "reach", context),
                active: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_watersport:windup", watersportScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(watersportId, "puddleRadius", action), deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.2, p(watersportId, "puddleRadius", action));
            const ticks = Math.max(120, Math.round(p(watersportId, "puddleTicks", action)));
            const wet = Math.round(p(watersportId, "wetTicks", action));
            const density = Math.round(p(watersportId, "soakDensity", action));
            const fire = Math.max(0.2, Math.min(0.95, p(watersportId, "fireFactor", action)));
            const quench = Math.round(p(watersportId, "quench", action));
            WorldEffects.field(world, watersportField, point, radius,
                { wet: wet, density: density, fire: fire, quench: quench }, ticks);
            world.sound("cobblemon:move.watersport.actor", point, 20, "{}");
            WorldFeedback.emit(world, watersportScene, 1, point,
                { moment: "splash", radius: radius, scale: radius / 3.2, density: density, fire: fire, ticks: ticks }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), watersportSplashText,
                [Math.round(ticks / 20), Math.round(fire * 100)], 44);
            done(action);
        }
    });
}
