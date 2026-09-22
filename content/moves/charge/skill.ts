/**
 * 充电 / Charge — 执行组织。
 *
 * 核心念头：把电能压进自己身体——起手把周围的电荷收进来，随后身上挂一层「充能」：特防 +1 级，下一次电属性
 *           招式借这股电威力翻倍。那一击落下时电荷从身上炸开用掉；若一直不用，它会随时间自行褪去。
 *
 * 出手：瞬发在自己身上，可见一段电荷内聚的起手。任何生物都能充能，但只有宝可梦有能力在招式层面用掉它。
 * 持电：`world_combat:charge_up`（共享身份 charge）持续存在，特防 +1 级；期间身上低密度电弧。
 * 用掉：下一次电属性招式命中时（任意来源的招式），由 rules.ts 的 incoming 规则读取并 ×2 后移除电荷，
 *       在施法者身上炸开一圈放电。
 * 自散：走到时间尽头或被牛奶/`/effect` 解除时安静收场；特防等级按原生语义独立保留。
 * 配置项 hold（蓄满电）：充能更久、冷却更长；关闭则更短更便宜。
 */
namespace PokemonSkills {
    define({
        id: "charge", name: "充电", description: "把电能压进自己身体：特防提高 1 级，下一次电属性招式威力翻倍；那一击落下时电荷炸开用掉，不用则会随时间自行褪去。",
        uses: ["决招前蓄力", "硬吃一发法术", "接电招爆发", "用储存的电荷给机器供能"], kind: "self", range: 1, prepare: 6, active: 0, recover: 6, cooldown: 70, style: "charge",
        defaults: { hold: false },
        fields: [flag("hold", "蓄满电")],
        indicator: function (config, pokemon) {
            return { radius: p("charge", "auraRadius", pokemon), geometry: "area", style: "charge",
                label: config && config.hold ? "蓄满电" : "即充电" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["charge"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("charge", "cooldown", context) + (config && config.hold ? 18 : -10);
            return { prepare: p("charge", "prepare", context), recover: p("charge", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["charge"].active, range: skills["charge"].range };
        },
        windup: function (action) {
            action.present("charge:gather", chargeScene, 1, action.origin(), JSON.stringify({ moment: "gather", actor: String(action.actor().ref()) }));
            return p("charge", "prepare", action);
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const duration = p("charge", "chargeDuration", action);
            const sparks = p("charge", "sparkCount", action);
            const radius = p("charge", "auraRadius", action);
            const discharge = p("charge", "dischargeRadius", action);
            const speed = p("charge", "sparkSpeed", action);
            const previous = world.effects(actor, chargeMark);
            for (let i = 0; i < previous.length; i++) world.operation(previous[i].id(), "world_combat:dispel", "{}");
            MobEffects.apply(world, actor, chargeUp, duration, 0);
            const energyBudget = Math.max(0, Math.round(p("charge", "energyBudget", action)));
            world.effect(chargeMark, actor, JSON.stringify({ sparks: sparks, radius: radius, discharge: discharge, speed: speed,
                energyBudget: energyBudget, energyRemaining: energyBudget, energyPulse: Math.max(1, Math.round(p("charge", "energyPulse", action))) }), duration);
            NativeEffects.boost(world, actor, "spd", 1);
            sound(action, "minecraft:block.respawn_anchor.charge");
            if (body !== null)
                WorldFeedback.emit(world, chargeScene, 1, body.position(),
                    { moment: "charged", actor: String(actor.ref()), sparks: sparks, scale: Math.max(0.5, radius / 0.5) }, 30);
            done(action);
        }
    });
}
