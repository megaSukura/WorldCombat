/**
 * 精神场地 / psychicterrain 的出手方式。
 *
 * 念头的形状：施法者把念力压进地面（windup：身周浮起念环）→ 落点炸开一圈粉色纹路、念纹贴着地皮铺满一片地
 * （surge）→ 站上去的活体被念场稳住：受到的击退与位移减半，超能招式更猛（field / brace）→ 念力散去（field 到期）。
 * 三幕：起手 → 铺场 → 稳定与增幅。
 *
 * 落点先探到真实地表再铺，精神域与地面同层；稳定与增幅不看标记余寿，按 `WorldEffects.covers` 实时确认在场且贴地。
 * 提交前只播预告；精神域在提交后铺。它是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: psychicterrainId,
        name: "精神场地",
        description: "在选定地面铺开精神域：贴地站在场上的活体受到的击退、冲量与位移削减一半，超能力属性招式威力提高；对双方一视同仁，离地或走出场地立即失去。",
        uses: ["给阵线上需要守位的队伍削减被击退与位移", "给超能力招式加成", "在贴身的近战对手面前稳住自己的站位"],
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
            const world = action.world();
            // 精神域铺在真实地面上：与场地同层/贴地的资格才成立，脚点高度由共享 groundedContact 读取。
            const point = WorldGeometry.ground(world, action.targetPosition(), 4);
            const radius = Math.max(2.2, p(psychicterrainId, "fieldRadius", action));
            const ticks = Math.max(120, Math.round(p(psychicterrainId, "fieldTicks", action)));
            const boost = Math.max(1.05, p(psychicterrainId, "boost", action));
            const density = Math.round(p(psychicterrainId, "density", action));
            const surge = Math.round(p(psychicterrainId, "surge", action));
            WorldEffects.field(world, psychicterrainField, point, radius,
                { element: "psychic", colour: 0xF85888, density: density, boost: boost, surge: surge }, ticks);
            world.sound("minecraft:block.beacon.activate", point, 24, "{}");
            WorldFeedback.emit(world, psychicterrainScene, 1, point,
                { moment: "surge", radius: radius, scale: radius / 3.2, density: density, boost: boost, surge: surge }, 46);
            done(action);
        }
    });
}
