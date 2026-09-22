/**
 * 电气场地 / electricterrain 的出手方式。
 *
 * 念头的形状：施法者压低身子，把电流顺着前肢按进地面（windup：身上窜起短促的电弧）→ 落点炸开一圈电环、
 * 电弧贴着地皮爬满一块地（surge）→ 站上去的活体脚下纳电，电招更猛、被电得睡不着，已经睡着的会被电醒
 * （field / jolt / awake）→ 电荷散尽（field 到期）。三幕：起手 → 通地 → 带电与清醒。
 *
 * 提交前只播预告；电场在提交后铺。电场是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: "electricterrain",
        name: "电气场地",
        description: "把电流按进选定的地面：站在电场上的活体电属性招式威力提高，脚下的电荷让它无法入眠，已经睡着的会被电醒。对双方一视同仁。",
        uses: ["给电属性招式加成", "防止队伍被催眠", "电醒已经睡着的目标"],
        kind: "point",
        range: 15,
        maxRange: 20,
        prepare: 13,
        active: 0,
        recover: 9,
        cooldown: 160,
        style: "electric",
        defaults: { surging: false },
        fields: [flag("surging", "强电场")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("electricterrain", "fieldRadius", pokemon) : 3, geometry: "area", style: "electric",
                label: config && config.surging ? "强电场" : "稳电场" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["electricterrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const surging = !!(config && config.surging);
            return {
                prepare: Math.max(5, Math.round(p("electricterrain", "gather", context))),
                recover: Math.max(4, Math.round(p("electricterrain", "settle", context))),
                cooldown: Math.max(50, p("electricterrain", "cooldown", context) + (surging ? 16 : -10)),
                active: skills["electricterrain"].active,
                range: p("electricterrain", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_electricterrain:windup", electricScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("electricterrain", "fieldRadius", action), surging: config && config.surging ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = p("electricterrain", "fieldRadius", action);
            const ticks = Math.max(120, Math.round(p("electricterrain", "fieldTicks", action)));
            const wake = Math.round(p("electricterrain", "wakeTicks", action));
            const density = Math.round(p("electricterrain", "fieldDensity", action));
            const surge = Math.round(p("electricterrain", "surge", action));
            WorldEffects.field(world, electricField, point, radius,
                { wake: wake, density: density, surge: surge }, ticks);
            world.sound("cobblemon:impact.electric", point, 24, "{}");
            WorldFeedback.emit(world, electricScene, 1, point,
                { moment: "surge", radius: radius, scale: radius / 3, density: density, surge: surge }, 46);
            done(action);
        }
    });
}
