/**
 * 输电 / Electrify — 执行组织。
 *
 * 核心念头：一把电灌进对手身体，给它下一次出招通电——那一招在结算前变成电属性，落地后电荷爆开消失。
 *
 * 出手：向射程内、视线畅通的单个敌人瞬间输一道电（原生命中必中，优先度 0，在这里是瞬发快节奏）。
 * 持电：目标获得 `world_combat:electrified`（共享身份 electrify）与一份记录导法的 payload；期间身上持续噼啪。
 * 命中：目标出招时，rules.ts 的伤害元数据规则在结算前把有效属性改成电——之后 STAB、属性相性、电吸收特性
 *       与地面免疫照常参与；那一击落地后电荷爆开用掉。
 * 反制：只对单个目标、有射程与视线要求；能被拖过时间自然散去；用一招不合适的招式就等于浪费掉这次通电；
 *       可被牛奶或 `/effect` 清除。它对双方一视同仁，也能用在队友身上。
 * 配置项 allMoves（全导）：任何招式都变电但更短更贵；关闭则只把一般属性招式变电，更久更便宜。
 */
namespace PokemonSkills {
    define({
        id: "electrify", name: "输电", description: "向单个敌人灌一道电，让它下一次出招变成电属性，落地后电荷爆开用掉。可以把对手的普通招变成电招（吃地面免疫或电吸收），也可能抹掉它的属性与本系加成。",
        uses: ["预判改属性", "破除普通招", "帮电吸收队友"], kind: "enemy", range: 9, prepare: 4, active: 0, recover: 6, cooldown: 60, style: "electrify",
        defaults: { allMoves: false },
        fields: [flag("allMoves", "全导")],
        indicator: function (config, pokemon) {
            return { radius: p("electrify", "dischargeRadius", pokemon), geometry: "line", style: "electrify",
                label: config && config.allMoves ? "全导" : "滤波" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["electrify"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("electrify", "cooldown", context) + (config && config.allMoves ? 14 : -14);
            return { prepare: p("electrify", "prepare", context), recover: p("electrify", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["electrify"].active, range: skills["electrify"].range };
        },
        windup: function (action) {
            action.present("electrify:windup", electrifyScene, 1, action.origin(), JSON.stringify({ moment: "windup", actor: String(action.actor().ref()) }));
            return p("electrify", "prepare", action);
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) return "invalid-target";
            const body = world.observe(target);
            if (body === null || !world.clear(action.origin(), body.position())) return "target-not-visible";
            return "";
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null) { done(action); return; }
            const from = world.observe(self), to = world.observe(target);
            if (from === null || to === null) { done(action); return; }
            const duration = p("electrify", "surgeDuration", action);
            const arcs = p("electrify", "arcCount", action);
            MobEffects.apply(world, target, electrified, duration, 0);
            world.effect(electrifyPayload, target, JSON.stringify({ all: config && config.allMoves ? 1 : 0 }), duration);
            sound(action, "minecraft:entity.lightning_bolt.impact");
            WorldFeedback.emit(world, electrifyScene, 1, from.position(),
                { moment: "arc", target: String(target.ref()), arcCount: arcs, path: [String(self.ref()), String(target.ref())] }, 26);
            WorldFeedback.emit(world, electrifyScene, 1, to.position(),
                { moment: "charge", target: String(target.ref()), arcCount: arcs,
                    scale: Math.max(0.5, p("electrify", "dischargeRadius", action) / 0.9) }, 32);
            WorldFeedback.text(world, to.position().plus(WorldCombat.point(0, 1, 0)), electrifyText, [], 24);
            done(action);
        }
    });
    WorldCombat.preview("world_combat:electrify", JSON.stringify({ lineOfSight: true }));
}
