/**
 * 沙暴 / sandstorm 的出手方式。
 *
 * 念头的形状：施法者把脚边的沙石卷起来（windup：脚下一圈回旋的沙预告）→ 沙幕在落点炸开、贴地横扫
 * （burst）→ 幕里的活体被一趟趟磨掉血、被风推着走，岩石之躯嵌进沙砾、特防提高（field / scour / harden）
 * → 沙幕渐稀，地表留下一层被磨落的沙（settle / 积沙到期）。
 * 三幕：起风 → 扬沙 → 磨蚀与积沙。
 *
 * 提交前只播预告；沙幕（WorldEffects.field）与地表的沙（world.terrain）都在提交后写。
 * 沙幕是租借效果，到期自己结束；它随施法者走远 48 格自动收场。地表的沙用 linger 活过沙幕本身。
 */
namespace PokemonSkills {
    define({
        id: "sandstorm",
        name: "沙暴",
        description: "把地面的沙卷成一片横扫的沙幕：除岩石、地面、钢属性外，幕里的活体被一趟趟磨掉生命并被风推着走，岩石之躯的特防提高；磨落的沙留在地表一段时间。",
        uses: ["压制没有岩土护体的对手", "把成群的敌人磨在沙幕里", "增强岩石之躯的特防并推散站位"],
        kind: "point",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 150,
        style: "sand",
        defaults: { abrasive: false },
        fields: [flag("abrasive", "磨蚀狂沙")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("sandstorm", "stormRadius", pokemon) : 9, geometry: "area", style: "sand",
                color: 0xD8B26A, label: config && config.abrasive ? "磨蚀狂沙" : "缓沙覆盖" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["sandstorm"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const abrasive = !!(config && config.abrasive);
            return {
                prepare: Math.max(4, Math.round(p("sandstorm", "gather", context))),
                recover: Math.max(4, Math.round(p("sandstorm", "settle", context))),
                cooldown: Math.max(40, p("sandstorm", "cooldown", context) + (abrasive ? 16 : -10)),
                active: skills["sandstorm"].active,
                range: p("sandstorm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sandstorm:windup", sandstormScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("sandstorm", "stormRadius", action), abrasive: config && config.abrasive ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
            const radius = p("sandstorm", "stormRadius", action);
            const ticks = Math.max(120, Math.round(p("sandstorm", "stormTicks", action)));
            const swept = Math.round(p("sandstorm", "sweptTicks", action));
            const density = Math.round(p("sandstorm", "grainDensity", action));
            const scour = Math.max(0.01, Math.min(0.2, p("sandstorm", "scour", action)));
            const drift = Math.max(0.02, p("sandstorm", "drift", action));
            const interval = Math.max(30, Math.round(p("sandstorm", "grainInterval", action)));
            const cells = Math.max(8, Math.min(48, Math.round(radius * 2.5)));
            const sandTicks = Math.max(80, Math.round(ticks * 0.6));
            WorldEnvironment.replaceOwnWeather(world, actor);
            WorldEffects.field(world, sandstormField, point, radius,
                { swept: swept, density: density, scour: scour, drift: drift, interval: interval, cells: cells,
                    sandTicks: sandTicks, seeded: false, next: 0 }, ticks);
            world.sound("minecraft:entity.wind_charge.wind_burst", point, 32, "{}");
            WorldFeedback.emit(world, sandstormScene, 1, point,
                { moment: "burst", radius: radius, scale: radius / 9, density: density, cards: cells, ticks: ticks }, 48);
            done(action);
        }
    });
}
