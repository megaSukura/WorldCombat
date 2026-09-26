/**
 * 玩泥巴 / mudsport 的出手方式。
 *
 * 念头的形状：施法者把脚下的泥甩开（windup：脚边溅起泥点）→ 落点炸开一圈泥浆、泥贴着地皮糊满一片，
 * 用一层薄泥面标出范围（splash / field）→ 站进泥里的活体被糊上厚泥，使出的电招被压（coat）→
 * 泥干了（field 到期）。三幕：起手 → 铺泥 → 糊泥与压电。
 *
 * 提交前只播预告；泥滩在提交后铺。泥滩是租借效果（`WorldEffects.field`），薄泥面只是画面；地表方块不被替换，
 * 泥滩到期自己结束。任何站在范围内的活体——敌友、贴地与浮空——都会被糊上泥，不把空中对象硬按到地上。
 */
namespace PokemonSkills {
    define({
        id: mudsportId,
        cooldownParameter: "recharge",
        name: "玩泥巴",
        description: "在选定的地面摊开一片泥滩，以薄泥面标出范围：站在泥里的活体使出的电属性招式被压。对双方一视同仁。",
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
            const cover = Math.round(p(mudsportId, "mudCover", action));
            WorldEffects.field(world, mudsportField, point, radius,
                { coat: coat, density: density, factor: factor, cover: cover }, ticks);
            world.sound("cobblemon:move.mudsport.actor", point, 20, "{}");
            WorldFeedback.emit(world, mudsportScene, 1, point,
                { moment: "splash", scale: radius / 3.2, density: density, cover: cover }, 48);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), mudsportSplashText,
                [Math.round(ticks / 20), Math.round(factor * 100)], 44);
            done(action);
        }
    });
}
