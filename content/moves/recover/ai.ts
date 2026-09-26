/**
 * 自我再生 的伙伴 AI：这是不锁足、按刻交付的短主动再生，可以边走位边修，也能随时转攻放弃后半段。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）且还没到满血。
 * 什么算安全窗口：可见的活敌人都在 ai.safeDistance（默认 3）之外、也没有任何敌人正在攻击自己时，
 *   就当作可以边修边走的窗口；附近贴着敌人时不硬修——生命低于阈值一半（危急）时例外，先保命再谈后半段。
 *   （再生期间仍可走位，被打断或转攻会立刻收掉剩余回复，已回的保留。）
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放，窗口里它仍可走位。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会重新再生。
 * 配置：steady 布尔切换稳态——回复更多、窗口更长，代价是冷却更久、暴露更久；ai.safeDistance 调节要多空才开修。
 */
namespace CompanionBehavior {
    const recoverBelow = PokemonSkills.number("ai.healBelow", "再生阈值", 0.3, 0.9, 0.05);
    recoverBelow.help = "自身生命低于该比例就启动再生；调低更倾向硬撑，调高则一掉血就开始再生。";
    const recoverSteady = PokemonSkills.flag("steady", "稳态再生");
    recoverSteady.help = "开启稳态：回复总量 +0.05、再生窗口 ×1.35（每刻更慢），代价是冷却更久；关闭速生：回复略少、窗口 ×0.75、冷却更短。";
    const recoverSafe = PokemonSkills.number("ai.safeDistance", "安全距离", 1, 12, 1);
    recoverSafe.help = "可见敌人进入这个距离、或正被敌人攻击时，不再优先启动再生（生命低于阈值一半时无视它先保命）；调大要求退得更开，调小更愿意贴着战场修。";

    PokemonSkills.addPreferences("recover", { steady: false, ai: { healBelow: 0.7, safeDistance: 3 } }, [recoverBelow, recoverSteady, recoverSafe]);

    /** 视野里没有贴身的活敌人、也没有敌人正在攻击自己，才算一段能边走边修的短窗口。 */
    function recoverWindow(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        var self = source(context), safe = ai<number>(item, "safeDistance", 3);
        var nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || !(other.health > 0)) continue;
            if (other.attacking === self.ref) return false;
            if (distance(other.point, self.point) < safe) return false;
        }
        return true;
    }

    registerUse("recover", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(source(context));
            if (health >= below) return false;
            // 危急时不再等安全窗口；其余时候要有一段能边走边修的短窗口，才不浪费后半段回复。
            return health < below * 0.5 || recoverWindow(context, item);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
