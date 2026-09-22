/**
 * 奇妙空间 / wonderroom 的出手方式。
 *
 * 核心念头：在地面撑开一片淡青的交换空间，两半边沿反向旋转；踏进来的活体，防御与特防当场对调，
 *   走出去立刻换回；空间走完，两半边同时归位。
 *
 * 出手：起手（windup 播两半边预转）→ 提交后租出场地（open）→ 走进来的人被换（swap）／持续（inside）／
 *   走出去换回（unswap）→ 到期归位。
 * 提交前只播预告、只读 sense；空间在提交后按落点铺。
 */
namespace PokemonSkills {
    define({
        id: wonderRoomId,
        name: "奇妙空间",
        description: "在选定的地面撑开一片交换空间：站在里面的活体防御与特防互换。对双方一视同仁，走出去立刻换回。",
        uses: ["把物理坦换给特攻手打", "让特防高的单位扛住物理输出", "搅乱对手对攻防的判断"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 13,
        active: 0,
        recover: 8,
        cooldown: 170,
        style: "wonder",
        defaults: { span: 0 },
        fields: [
            field(pathOf("span"), "空间形态", "choice", { options: [{ value: 1, label: "广域" }, { value: 0, label: "紧凑" }] })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[wonderRoomId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const wide = config.span === 1;
            return {
                prepare: Math.max(5, Math.round(p(wonderRoomId, "tempo", context)) + (wide ? 2 : 0)),
                recover: Math.max(4, Math.round(p(wonderRoomId, "aftercast", context))),
                cooldown: Math.max(55, Math.round(p(wonderRoomId, "recharge", context) * (wide ? 1.15 : 0.85))),
                active: 0,
                range: p(wonderRoomId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wonderroom:windup", wonderRoomScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(wonderRoomId, "swapRadius", action), wide: config.span === 1 ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(wonderRoomId, "swapRadius", pokemon) : 3.4, geometry: "area", style: "wonder",
                color: 0x8FE8D8, label: config && config.span === 1 ? "广域交换" : "紧凑交换" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const ticks = Math.max(80, Math.round(p(wonderRoomId, "swapTicks", action)));
            const radius = p(wonderRoomId, "swapRadius", action);
            const density = Math.round(p(wonderRoomId, "density", action));
            WorldEffects.field(world, wonderRoomField, point, radius,
                { until: world.tick() + ticks, density: density }, ticks);
            world.sound("minecraft:block.conduit.activate", point, 24, "{}");
            WorldFeedback.emit(world, wonderRoomScene, 1, point,
                { moment: "open", radius: radius, scale: radius / 3.4, density: density }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), wonderRoomOpenText, [Math.round(ticks / 20)], 46);
            done(action);
        }
    });
}
