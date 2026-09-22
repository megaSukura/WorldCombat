/**
 * 等离子浴 / Ion Deluge — 执行组织。
 *
 * 核心念头：在选定地面铺开一片带电粒子浴场——站在里面的人身上会挂一层离子膜，那段时间里出的一般属性招式
 *           在结算前变成电属性。浴场对双方一视同仁，所以它既是强化也是干扰，铺在哪里是这招真正的选择。
 *
 * 出手：向射程内的地面铺开浴场（原生伪天气的即时生效 + 优先度 +1，在这里是快速的起手）。
 * 持场：`world_combat:field` 效果承载位置、半径、持续与密度；每 5 刻扫描一次，给区域内的人补离子膜，
 *       并按本招算出的半径与密度续一次画面。浴场离开施法者 48 格会自动结束。
 * 命中：离子膜是 `world_combat:ion_film`（共享身份 ionized）；带着膜的施法者出一般属性招式时，
 *       由 rules.ts 的伤害元数据规则把有效属性改成电——之后属性相性与电吸收特性照常参与结算。
 * 反制：走出浴场膜就脱落；浴场固定在地面、不跟随；对双方生效，可能反过来把对手的普通招变成电招。
 * 配置项 wide（广域）：覆盖更大但更短；关闭则更小但更久。
 */
namespace PokemonSkills {
    define({
        id: "iondeluge", name: "等离子浴", description: "在选定地面铺开带电粒子浴场：站在里面的任何人出一般属性招式时，那招变成电属性。对双方都生效，铺在哪里是真正的选择。",
        uses: ["把普通招转电", "铺场干扰对手", "电系队伍增益"], kind: "point", range: 10, prepare: 10, active: 0, recover: 8, cooldown: 120, style: "field",
        defaults: { wide: false },
        fields: [flag("wide", "广域浴场")],
        indicator: function (config, pokemon) {
            return { radius: p("iondeluge", "fieldRadius", pokemon), geometry: "area", style: "field",
                label: config && config.wide ? "广域浴场" : "持久浴场" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["iondeluge"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("iondeluge", "cooldown", context) + (config && config.wide ? 12 : -12);
            return { prepare: p("iondeluge", "prepare", context), recover: p("iondeluge", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["iondeluge"].active, range: skills["iondeluge"].range };
        },
        windup: function (action) {
            action.present("iondeluge:windup", ionDelugeScene, 1, action.targetPosition(), JSON.stringify({ moment: "windup", actor: String(action.actor().ref()) }));
            return p("iondeluge", "prepare", action);
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = p("iondeluge", "fieldRadius", action);
            const duration = p("iondeluge", "fieldDuration", action);
            const film = p("iondeluge", "filmTicks", action);
            const density = p("iondeluge", "ionDensity", action);
            WorldEffects.field(world, ionField, point, radius, { film: film, density: density }, duration);
            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, ionDelugeScene, 1, point, { moment: "field", density: density, duration: duration, scale: radius / 3.0 }, 46);
            done(action);
        }
    });
}
