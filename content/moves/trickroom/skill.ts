/**
 * 戏法空间 / trickroom 的出手方式。
 *
 * 核心念头：在地面按出一片靛紫的歪斜空间，边界是一圈反着转的波纹；站进去的人速度被倒转——
 *   慢的变快、快的变慢；空间走完，波纹反向收拢。
 *
 * 出手：起手（windup 播边界预张）→ 提交后租出场地（open）→ 走进来的人被扭（flip）／持续（inside）／
 *   走出去复原（unflip）→ 到期反向收拢。
 * 提交前只播预告、只读 sense；空间在提交后按落点铺。
 */
namespace PokemonSkills {
    define({
        id: trickRoomId,
        name: "戏法空间",
        description: "在选定的地面按出一片歪斜空间：站在里面的活体速度被倒转，慢于基准的被推快、快于基准的被拖慢。对双方一视同仁，走出去立刻恢复。",
        uses: ["让己方慢速单位抢先进位", "拖慢对手的快速突击", "在自己与对手之间扭一片交战区"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 14,
        active: 0,
        recover: 9,
        cooldown: 175,
        style: "trick",
        defaults: { turn: 0 },
        fields: [
            field(pathOf("turn"), "扭转方式", "choice", { options: [{ value: 1, label: "强扭" }, { value: 0, label: "缓扭" }] })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[trickRoomId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const strong = config.turn === 1;
            return {
                prepare: Math.max(6, Math.round(p(trickRoomId, "tempo", context))),
                recover: Math.max(4, Math.round(p(trickRoomId, "aftercast", context))),
                cooldown: Math.max(55, Math.round(p(trickRoomId, "recharge", context) * (strong ? 1.15 : 0.85))),
                active: 0,
                range: p(trickRoomId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_trickroom:windup", trickRoomScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(trickRoomId, "spinRadius", action), strong: config.turn === 1 ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(trickRoomId, "spinRadius", pokemon) : 3.6, geometry: "area", style: "trick",
                color: 0x8A6CFF, label: config && config.turn === 1 ? "强扭空间" : "缓扭空间" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const ticks = Math.max(80, Math.round(p(trickRoomId, "spinTicks", action)));
            const radius = p(trickRoomId, "spinRadius", action);
            const reference = Math.round(p(trickRoomId, "reference", action));
            const depth = p(trickRoomId, "depth", action);
            const density = Math.round(p(trickRoomId, "density", action));
            WorldEffects.field(world, trickRoomField, point, radius,
                { until: world.tick() + ticks, reference: reference, depth: depth, density: density }, ticks);
            world.sound("minecraft:block.conduit.activate", point, 24, "{}");
            WorldFeedback.emit(world, trickRoomScene, 1, point,
                { moment: "open", radius: radius, scale: radius / 3.6, density: density, depth: depth }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), trickRoomOpenText, [Math.round(ticks / 20)], 46);
            done(action);
        }
    });
}
