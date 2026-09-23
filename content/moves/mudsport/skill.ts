/**
 * 玩泥巴 / mudsport 的出手方式。
 *
 * 念头的形状：施法者把脚下的泥甩开（windup：脚边溅起泥点）→ 落点炸开一圈泥浆、泥贴着地皮糊满一片，
 * 把地表方块换成泥（splash / floor）→ 站进泥里的活体被糊上厚泥，使出的电招被压（field / coat）→
 * 泥干了、原方块回来（field 到期）。三幕：起手 → 铺泥 → 糊泥与压电。
 *
 * 提交前只播预告；泥滩在提交后铺。泥滩是租借效果（`WorldEffects.field`）加一租贴地泥块（`terrain`，
 * linger 到泥滩时长），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: mudsportId,
        cooldownParameter: "recharge",
        name: "玩泥巴",
        description: "在选定的地面摊开一片泥滩，把地表糊成泥：站在泥里的活体使出的电属性招式被压。对双方一视同仁。",
        uses: ["压制电属性对手", "在电招齐射前先铺泥", "把交战区变成粘脚的泥地"],
        kind: "point",
        range: 13,
        maxRange: 19,
        prepare: 12,
        active: 0,
        recover: 7,
        cooldown: 140,
        style: "mud",
        defaults: { thick: false },
        fields: [flag("thick", "厚泥")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(mudsportId, "mudRadius", pokemon) : 3.2, geometry: "area", style: "mud",
                color: 0x6B4A2E, label: config && config.thick ? "厚泥" : "稀泥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mudsportId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !!(config && config.thick);
            return {
                prepare: Math.max(4, Math.round(p(mudsportId, "tempo", context))),
                recover: Math.max(3, Math.round(p(mudsportId, "aftercast", context))),
                cooldown: Math.max(60, Math.round(p(mudsportId, "recharge", context))),
                range: p(mudsportId, "reach", context),
                active: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_mudsport:windup", mudsportScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(mudsportId, "mudRadius", action), thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.2, p(mudsportId, "mudRadius", action));
            const ticks = Math.max(120, Math.round(p(mudsportId, "mudTicks", action)));
            const coat = Math.round(p(mudsportId, "coatTicks", action));
            const density = Math.round(p(mudsportId, "mudDensity", action));
            const factor = Math.max(0.25, Math.min(0.95, p(mudsportId, "electricFactor", action)));
            const cells = mudsportFloor(world, point, radius, Math.max(8, Math.round(p(mudsportId, "mudCells", action))), ticks);
            WorldEffects.field(world, mudsportField, point, radius,
                { coat: coat, density: density, factor: factor, cells: cells }, ticks);
            world.sound("cobblemon:move.mudsport.actor", point, 20, "{}");
            WorldFeedback.emit(world, mudsportScene, 1, point,
                { moment: "splash", radius: radius, scale: radius / 3.2, density: density, factor: factor, cells: cells }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), mudsportSplashText,
                [Math.round(ticks / 20), Math.round(factor * 100)], 44);
            done(action);
        }
    });
}
