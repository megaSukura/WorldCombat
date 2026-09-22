/**
 * 精神场地 / psychicterrain 的出手方式。
 *
 * 念头的形状：施法者把念力压进地面（windup：身周浮起念环）→ 落点炸开一圈粉色纹路、念纹贴着地皮铺满一片地
 * （surge）→ 站上去的活体被念场托住：先制招式打不到它，超能招式更猛（field / ward）→ 念力散去（field 到期）。
 * 三幕：起手 → 铺场 → 护场与增幅。
 *
 * 提交前只播预告；精神域在提交后铺。它是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: psychicterrainId,
        name: "精神场地",
        description: "在选定的地面铺开精神域：站在场上的活体不会被先制招式打到，超能力招式威力提高。对双方一视同仁。",
        uses: ["封住对手的先制招式", "给超能力招式加成", "用先制招式反打前先护住队伍"],
        kind: "point",
        range: 15,
        maxRange: 20,
        prepare: 13,
        active: 0,
        recover: 9,
        cooldown: 160,
        style: "psychic",
        defaults: { focus: false },
        fields: [flag("focus", "聚焦")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(psychicterrainId, "fieldRadius", pokemon) : 3.2, geometry: "area", style: "psychic",
                color: 0xD86FC0, label: config && config.focus ? "聚焦主场" : "护场" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psychicterrainId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.max(5, Math.round(p(psychicterrainId, "gather", context) + (focus ? 3 : -2))),
                recover: Math.max(4, Math.round(p(psychicterrainId, "settle", context))),
                cooldown: Math.max(60, Math.round(p(psychicterrainId, "cooldown", context) * (focus ? 1.2 : 0.9))),
                active: skills[psychicterrainId].active,
                range: p(psychicterrainId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychicterrain:windup", psychicterrainScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(psychicterrainId, "fieldRadius", action), focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(2.2, p(psychicterrainId, "fieldRadius", action));
            const ticks = Math.max(120, Math.round(p(psychicterrainId, "fieldTicks", action)));
            const mark = Math.round(p(psychicterrainId, "markTicks", action));
            const boost = Math.max(1.05, p(psychicterrainId, "boost", action));
            const density = Math.round(p(psychicterrainId, "density", action));
            const surge = Math.round(p(psychicterrainId, "surge", action));
            WorldEffects.field(world, psychicterrainField, point, radius,
                { mark: mark, density: density, boost: boost, surge: surge }, ticks);
            world.sound("minecraft:block.beacon.activate", point, 24, "{}");
            WorldFeedback.emit(world, psychicterrainScene, 1, point,
                { moment: "surge", radius: radius, scale: radius / 3.2, density: density, boost: boost, surge: surge }, 46);
            done(action);
        }
    });
}
