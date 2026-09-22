/**
 * 重力 / gravity 的出手方式。
 *
 * 念头的形状：施法者把全身的重量压进地面（windup：脚边尘土先浮后被扯下去）→ 落点塌出一口重力井、
 * 尘土与石屑被持续吸向地面（fall / field）→ 井里的活体被拽落、浮空身份被拔、凌空招式再也起不了手
 * （pin / stripped）→ 重力散了，一切恢复。三幕：起手 → 压井 → 拽落与封锁。
 *
 * 提交前只播预告；重力井在提交后压。井是租借效果（`WorldEffects.field`），到期自己结束；
 * 跟着施法者离开 48 格会自动收场。
 */
namespace PokemonSkills {
    define({
        id: gravityId,
        name: "重力",
        description: "在选定的地面压下一口重力井：井里的活体被拽向地面、浮空身份被拔掉，飞向空中的招式再也使不出来。对双方一视同仁。",
        uses: ["把飞在空中的对手按回地面", "封住对手的飞行与浮空招式", "给地面招式创造能打到空中目标的局面"],
        kind: "point",
        range: 12,
        maxRange: 18,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 220,
        style: "gravity",
        defaults: { crush: false },
        fields: [
            flag("crush", "重压")
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(gravityId, "wellRadius", pokemon) : 3.4, geometry: "area", style: "gravity",
                color: 0x9B8FC2, label: config && config.crush ? "重压" : "广域" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[gravityId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const crush = !!(config && config.crush);
            return {
                prepare: Math.max(5, Math.round(p(gravityId, "gather", context) + (crush ? 3 : -2))),
                recover: Math.max(4, Math.round(p(gravityId, "settle", context))),
                cooldown: Math.max(70, Math.round(p(gravityId, "cooldown", context) * (crush ? 1.2 : 0.9))),
                active: skills[gravityId].active,
                range: p(gravityId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_gravity:windup", gravityScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p(gravityId, "wellRadius", action), crush: config && config.crush ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.6, p(gravityId, "wellRadius", action));
            const ticks = Math.max(120, Math.round(p(gravityId, "wellTicks", action)));
            const pull = Math.max(0.1, p(gravityId, "pull", action));
            const pin = Math.round(p(gravityId, "pinTicks", action));
            const density = Math.round(p(gravityId, "density", action));
            const shock = Math.round(p(gravityId, "shock", action));
            WorldEffects.field(world, gravityField, point, radius,
                { pull: pull, density: density, shock: shock, pin: pin }, ticks);
            world.sound("minecraft:item.mace.smash_ground_heavy", point, 22, "{}");
            WorldFeedback.emit(world, gravityScene, 1, point,
                { moment: "fall", radius: radius, scale: radius / 3.4, density: density, shock: shock }, 46);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), gravityFallText, [Math.round(ticks / 20)], 40);
            done(action);
        }
    });
}
