/**
 * 魔法空间 / magicroom 的出手方式。
 *
 * 核心念头：在地面撑开一片银灰的静默空间，圈内所有携带物的微光被吸走；道具的轮廓还在，力量传不出来；
 *   空间散去，光回到道具上。
 *
 * 出手：起手（windup 播银光内收）→ 提交后租出场地（open）→ 走进来的人被静默（gag）／持续（inside）／
 *   走出去恢复（chip）→ 到期散场。
 * 提交前只播预告、只读 sense；空间在提交后按落点铺。
 */
namespace PokemonSkills {
    define({
        id: magicRoomId,
        name: "魔法空间",
        description: "在选定的地面撑开一片静默空间：站在里面的活体，携带道具的效果全部消失。对双方一视同仁，走出去立刻恢复。",
        uses: ["废掉对手依赖道具的套路", "在道具交换前先让道具失效", "让己方不靠道具的战力占便宜"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 13,
        active: 0,
        recover: 8,
        cooldown: 175,
        style: "magic",
        defaults: { hush: 0 },
        fields: [
            field(pathOf("hush"), "静默方式", "choice", { options: [{ value: 1, label: "长默" }, { value: 0, label: "快默" }] })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magicRoomId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const long = config.hush === 1;
            return {
                prepare: Math.max(5, Math.round(p(magicRoomId, "tempo", context)) + (long ? 2 : 0)),
                recover: Math.max(4, Math.round(p(magicRoomId, "aftercast", context))),
                cooldown: Math.max(55, Math.round(p(magicRoomId, "recharge", context) * (long ? 1.15 : 0.85))),
                active: 0,
                range: p(magicRoomId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_magicroom:windup", magicRoomScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(magicRoomId, "gagRadius", action), long: config.hush === 1 ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(magicRoomId, "gagRadius", pokemon) : 3.4, geometry: "area", style: "magic",
                color: 0xC8D0E0, label: config && config.hush === 1 ? "长默空间" : "快默空间" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const ticks = Math.max(80, Math.round(p(magicRoomId, "gagTicks", action)));
            const radius = p(magicRoomId, "gagRadius", action);
            const density = Math.round(p(magicRoomId, "density", action));
            WorldEffects.field(world, magicRoomField, point, radius,
                { until: world.tick() + ticks, density: density }, ticks);
            world.sound("minecraft:block.conduit.deactivate", point, 24, "{}");
            WorldFeedback.emit(world, magicRoomScene, 1, point,
                { moment: "open", radius: radius, scale: radius / 3.4, density: density }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), magicRoomOpenText, [Math.round(ticks / 20)], 46);
            done(action);
        }
    });
}
