/**
 * 青草场地 / grassyterrain 的出手方式。
 *
 * 念头的形状：施法者俯身把草种按进地面（windup：脚下泛起一圈绿光）→ 草叶成圈从落点涌出、铺满一块地
 * （sprout）→ 站上去的活体脚下生根，缓慢回血、草招更猛、地面震招被卸掉一半（field / root / heal）→
 * 草叶枯黄收场（field 到期）。开启 blooming 时还会顺手照料草地里的植物（growth）。
 * 三幕：起手 → 长草 → 托举与回复。
 *
 * 提交前只播预告；场地在提交后铺。草地是租借效果（`WorldEffects.field`），到期自己结束。
 */
namespace PokemonSkills {
    define({
        id: "grassyterrain",
        name: "青草场地",
        description: "把青草种进选定的地面：站在草地上的活体缓慢回复生命，草属性招式威力提高，地震与重踏被草根卸掉一半。开启密植还会照料草地里的植物。对双方一视同仁。",
        uses: ["持续回复", "给草属性招式加成", "压制地面震招", "照料植物"],
        kind: "point",
        range: 15,
        maxRange: 20,
        prepare: 15,
        active: 0,
        recover: 11,
        cooldown: 170,
        style: "grass",
        defaults: { blooming: false },
        fields: [flag("blooming", "密植照料")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("grassyterrain", "fieldRadius", pokemon) : 3, geometry: "area", style: "grass",
                label: config && config.blooming ? "密植草地" : "野草地" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["grassyterrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const blooming = !!(config && config.blooming);
            return {
                prepare: Math.max(5, Math.round(p("grassyterrain", "gather", context))),
                recover: Math.max(5, Math.round(p("grassyterrain", "settle", context))),
                cooldown: Math.max(50, p("grassyterrain", "cooldown", context) + (blooming ? 16 : -12)),
                active: skills["grassyterrain"].active,
                range: p("grassyterrain", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_grassyterrain:windup", grassyScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("grassyterrain", "fieldRadius", action), blooming: config && config.blooming ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition(), blooming = !!(config && config.blooming);
            const radius = p("grassyterrain", "fieldRadius", action);
            const ticks = Math.max(120, Math.round(p("grassyterrain", "fieldTicks", action)));
            const ratio = p("grassyterrain", "healRatio", action);
            const interval = Math.round(p("grassyterrain", "healInterval", action));
            const density = Math.round(p("grassyterrain", "bloomDensity", action));
            const growth = blooming ? Math.round(p("grassyterrain", "growth", action)) : 0;
            WorldEffects.field(world, grassyField, point, radius,
                { ratio: ratio, interval: interval, density: density, mark: 24, bloom: blooming, growth: growth }, ticks);
            world.sound("minecraft:block.grass.place", point, 24, "{}");
            WorldFeedback.emit(world, grassyScene, 1, point,
                { moment: "sprout", radius: radius, scale: radius / 3, density: density, bloom: blooming ? 1 : 0 }, 46);
            done(action);
        }
    });
}
