/**
 * 喝牛奶 的伙伴 AI：它除了补血以外还能冲掉中毒，所以即使血线还高、只要中毒就值得动用；
 * 但这是一次要连喝完的饮用（期间不能转做别的出手），所以要先有一段能连续喝的窗口。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7），或者身上带着共享身份 world_combat:status/poison（任一来源的中毒）。
 * 什么算能连喝：可见的活敌人都在 ai.safeDistance（默认 6）之外、也没有敌人正在攻击自己；贴着敌人时不硬喝，
 *   中毒或生命低于阈值一半（危急）时例外——先解掉毒或续上命更要紧。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放，饮用期间可以继续走位。
 * 优先级：中毒时给 40（提示共用顺序优先把这一口用来解毒），其余时候 0；急救与硬续命交给保命、撤退和偷懒，不靠这一口。
 * 配置：warm 布尔切换温奶——回复更多、口间隔更长，代价是冷却更久；关闭冷饮则喝得急、补得少、冷却短。ai.safeDistance 调节要多空才举瓶。
 */
namespace CompanionBehavior {
    const milkdrinkBelow = PokemonSkills.number("ai.healBelow", "饮用阈值", 0.3, 0.9, 0.05);
    milkdrinkBelow.help = "自身生命低于该比例就喝一口；调低更倾向硬撑，调高则一掉血就喝。中毒时不受此阈值限制。";
    const milkdrinkWarm = PokemonSkills.flag("warm", "温奶");
    milkdrinkWarm.help = "开启温奶：回复总量 +0.05、口间隔 ×1.3（喝得慢），代价是冷却更久；关闭冷饮：回复 −0.03、口间隔 ×0.8、冷却更短。";
    const milkdrinkSafe = PokemonSkills.number("ai.safeDistance", "安全距离", 1, 14, 1);
    milkdrinkSafe.help = "可见敌人进入这个距离、或正被敌人攻击时，不再优先举瓶连喝（中毒或生命低于阈值一半时无视它）；调大要退得更开，调小更愿意在混战里喝。";

    PokemonSkills.addPreferences("milkdrink", { warm: false, ai: { healBelow: 0.7, safeDistance: 6 } }, [milkdrinkBelow, milkdrinkWarm, milkdrinkSafe]);

    /** 视野里没有贴身的活敌人、也没有敌人正在攻击自己，才算一段能连续喝完的窗口。 */
    function milkdrinkWindow(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        var self = source(context), safe = ai<number>(item, "safeDistance", 6);
        var nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || !(other.health > 0)) continue;
            if (other.attacking === self.ref) return false;
            if (distance(other.point, self.point) < safe) return false;
        }
        return true;
    }

    registerUse("milkdrink", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        priority: function (context, item) { return CompanionBehavior.status(context, source(context), "poison") ? 40 : 0; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var self = source(context), below = ai<number>(item, "healBelow", 0.7), health = ratio(self);
            var poisoned = CompanionBehavior.status(context, self, "poison");
            if (!poisoned && health >= below) return false;
            // 中毒或危急时不等安全窗口；其余时候要有一段能连续喝完的窗口才举瓶。
            return poisoned || health < below * 0.5 || milkdrinkWindow(context, item);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
