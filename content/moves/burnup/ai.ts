/**
 * 燃尽 / burnup 的 AI 用途。
 *
 * 什么局面下出手：身前一道锥面白焰，对手可见、敌对、活着且在 `ai.maxChase`（默认 10）之内即可；
 *   够不到交给共享接近逻辑。
 * 起手条件：燃尽期间（共享身份 world_combat:status/burned_out）不再出手——`ready` 直接否掉，
 *   因为自己已经不是火属性、根本点不着。
 * 对谁出手：它是一发把自己烧空的重击，所以只在划算时才用：目标对火弱时 priority 抬到 40，
 *   目标生命低于 `ai.holdUntil`（默认 0.6）时再抬到 48——留着收人头，不拿来试探。
 * 放完接什么：交回共享交战计划；接下来一段时间自己不带火属性，别的火招与它一起让位。
 */
namespace PokemonSkills {
    /** 目标是否对火属性吃亏（相性 > 1）。 */
    function burnupFireWeak(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        const world = CompanionBehavior.world(context), foe = world.actor(target.ref);
        if (foe === null || !world.valid(foe)) return false;
        const types = PokemonDamage.combatants.read(world, foe).types;
        let factor = 1;
        for (let i = 0; i < types.length; i++) factor *= CobblemonCombat.typeEffectiveness("fire", types[i]);
        return factor > 1;
    }

    CompanionBehavior.registerUse(burnupId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return !CompanionBehavior.status(context, CompanionBehavior.source(context), "burned_out");
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let value = 14;
            if (burnupFireWeak(context, target)) value = 40;
            if (CompanionBehavior.ratio(target) <= CompanionBehavior.ai<number>(capability, "holdUntil", 0.6)) value = Math.max(value, 48);
            return value;
        }
    });

    addPreferences(burnupId, {}, [
        field(pathOf("banked"), "余烬", "boolean", {
            help: "开启：燃尽时长 ×0.7、冷却少 4 刻（更快拿回火属性），但本击 ×0.9。关闭：烧得更久、冷却更久，本击 ×1.1。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动蓄火，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.holdUntil"), "留作收割的生命线", "number", {
            min: 0.2, max: 1, step: 0.05,
            help: "目标生命低于这个比例时把燃尽排到最前（留着收人头）。调高会让你更早动用这一发。"
        })
    ]);
}
