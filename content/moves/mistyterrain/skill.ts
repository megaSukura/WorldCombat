/**
 * 薄雾场地 / mistyterrain 的出手方式。
 *
 * 念头的形状：施法者把雾从身下压向地面（windup：脚边腾起雾絮）→ 落点炸开一圈雾环、薄雾贴着地皮漫满一片
 * （surge）→ 站上去的活体被雾裹住：异常状态落不下来、龙属性来招被削掉一半（field / ward）→
 * 开到净化时，雾在活体首次进入本次雾时把已经中的异常洗掉一次（cleanse）→ 雾散（field 到期）。
 * 三幕：起手 → 漫雾 → 挡异常与削龙；净化的清除每块雾每个活体只发生一次。
 *
 * 提交前只播预告；薄雾在提交后漫。它是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: mistyterrainId,
        name: "薄雾场地",
        description: "在选定的地面铺开薄雾：站在场上的活体不会陷入异常状态，受到的龙属性招式伤害减半。开启净化时，首次进入本次雾的活体还会被洗掉已经中的异常一次。对双方一视同仁。",
        uses: ["护住队伍不被上异常", "削掉对手的龙属性爆发", "净化已经中毒、灼伤、麻痹的队友"],
        kind: "point",
        range: 15,
        maxRange: 20,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 170,
        style: "mist",
        defaults: { purify: false },
        fields: [flag("purify", "净化雾")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(mistyterrainId, "fieldRadius", pokemon) : 3.2, geometry: "area", style: "mist",
                color: 0xBFE3EF, label: config && config.purify ? "净化雾" : "薄幕" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistyterrainId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const purify = !!(config && config.purify);
            return {
                prepare: Math.max(5, Math.round(p(mistyterrainId, "gather", context) + (purify ? 3 : -2))),
                recover: Math.max(4, Math.round(p(mistyterrainId, "settle", context))),
                cooldown: Math.max(60, Math.round(p(mistyterrainId, "cooldown", context) * (purify ? 1.2 : 0.9))),
                active: skills[mistyterrainId].active,
                range: p(mistyterrainId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_mistyterrain:windup", mistyterrainScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(mistyterrainId, "fieldRadius", action), purify: config && config.purify ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(2.2, p(mistyterrainId, "fieldRadius", action));
            const ticks = Math.max(120, Math.round(p(mistyterrainId, "fieldTicks", action)));
            const mark = Math.round(p(mistyterrainId, "markTicks", action));
            const dragon = Math.max(0.2, Math.min(1, p(mistyterrainId, "dragonFactor", action)));
            const density = Math.round(p(mistyterrainId, "density", action));
            const surge = Math.round(p(mistyterrainId, "surge", action));
            WorldEffects.field(world, mistyterrainField, point, radius,
                { mark: mark, density: density, dragon: dragon, purify: config && config.purify ? 1 : 0, surge: surge }, ticks);
            world.sound("minecraft:block.conduit.activate", point, 22, "{}");
            WorldFeedback.emit(world, mistyterrainScene, 1, point,
                { moment: "surge", scale: radius / 3.2, density: density }, 46);
            done(action);
        }
    });
}
