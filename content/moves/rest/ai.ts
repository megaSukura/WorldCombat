/**
 * 睡觉 的伙伴 AI：这招唯一的价值是「在安全窗口里回满」，所以 AI 自己判断什么时候算安全。
 *
 * 何时考虑：自身生命低于 ai.healBelow，且还没有睡着。
 * 什么算安全：自己最近 30 刻没有挨打，视野里没有活着的敌人进入 ai.safeDistance，也没有任何可见敌人正在攻击自己。
 *   最后一条覆盖了远处放冷箭的敌人与正在攻击的 Boss：攻击者哪怕在安全距离之外，也说明这一觉会被立刻打醒。
 *   附近有威胁时不硬睡——把位置让给共用计划里的保命与撤退，等拉开距离再回来睡。
 * 紧急：生命见底（低于阈值一半）时 priority 置为 110，越过共享顺序先睡下去把命续上。
 * 对谁出手：只有自己（kind self），reach 0。
 * 配置：睡眠深度（shortNap 布尔）在参数层改变时长、回复、加速与冷却。
 */
namespace CompanionBehavior {
    const restHealBelow = PokemonSkills.number("ai.healBelow", "睡眠阈值", 0.3, 0.9, 0.05);
    restHealBelow.help = "伙伴自身生命低于该比例时才把这招排进恢复计划；调低更倾向硬撑，调高则一受伤就找安全处。";
    const restSafeDistance = PokemonSkills.number("ai.safeDistance", "安全距离", 2, 16, 1);
    restSafeDistance.help = "视野里没有活着的敌人进入这个距离，伙伴才把这招当作安全窗口；调小会贴着战场睡，调大要退得更远。";

    PokemonSkills.addPreferences("rest", { shortNap: false, helpFriends: false, ai: { healBelow: 0.6, safeDistance: 6 } }, [restHealBelow, restSafeDistance]);

    function restSafe(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        var self = source(context), safe = ai<number>(item, "safeDistance", 6);
        if (self.hurtAgo < 30) return false;
        var nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || !(other.health > 0)) continue;
            // 远程可见威胁：哪怕在安全距离之外，能打到自己的人也算威胁——Boss 正在攻击时不因距离够远就睡。
            if (other.attacking === self.ref) return false;
            if (distance(other.point, self.point) < safe) return false;
        }
        return true;
    }

    registerUse("rest", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function (context) { return !status(context, source(context), "sleep"); },
        priority: function (context, item) {
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.6) * 0.5 ? 110 : 0;
        },
        available: function (context, item) {
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.6) && restSafe(context, item);
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
