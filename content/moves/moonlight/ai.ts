/**
 * 月光 的伙伴 AI：它是一口靠夜色吃饭的回复，也能熄掉灼伤，所以 AI 先看有没有火，再谈天色与落脚点。
 *
 * 何时考虑：身上带着灼伤（共享身份 burn）时立即排进恢复计划——哪怕满血也要把火熄掉；否则等生命低于
 *   ai.healBelow（默认 0.7）再排。
 * 等夜：ai.waitForSky（默认开）打开时只在「月色可及」时出手——执行、说明与 AI 共用同一个 moonlightSkyAt
 *   真事实（夜晚 × 可见天空 × 无雨），不再用「日照偏低」伪推月光，所以白天洞穴不会被误判成晴夜强档。
 *   关闭后白天也照用，只拿保底回复。等待中若生命已跌到回复阈值一半以下，先取保底，不为等月色错过窗口。
 * 落脚点：晴夜是驻足承月（stationary），所以月色可及时还要有一段能站完承月的窗口——视野里没有贴身的活敌人、
 *   也没有敌人正攻击自己；生命低于阈值一半的危急情形例外，先续命再谈站桩。
 * 对谁出手：只有自己（kind self），reach 0；判断对任意主体的身份与亲密度缺省沿用中性基准，不因普通模组生物而崩公式。
 * 放完之后：生命补进来并冷却掉灼伤（若身上有），随后交回共用交战计划。
 */
namespace CompanionBehavior {
    const moonlightBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    moonlightBelow.help = "没有灼伤时，自身生命低于该比例才把月光排进恢复计划；调低更倾向硬撑，调高则一掉血就承月。身上有灼伤时无视此值，优先熄火。";
    const moonlightSky = PokemonSkills.flag("ai.waitForSky", "等月色");
    moonlightSky.help = "开启：只在月色可及（夜晚晴空）且有一段安全落脚点时驻足承月，白天把这招留着；关闭：受伤就照用，接受保底回复。有灼伤需要熄火、或生命低于阈值一半时不受此限。";

    PokemonSkills.addPreferences("moonlight", { ai: { healBelow: 0.7, waitForSky: true } }, [moonlightBelow, moonlightSky]);

    /** 一段能站完承月的窗口：视野里没有贴身的活敌人、也没有敌人正攻击自己。 */
    function moonlightWindow(context: WorldBehavior.Context): boolean {
        var self = source(context), safe = 6, nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (!other.visible || other.friendly || !(other.health > 0)) continue;
            if (other.attacking === self.ref) return false;
            if (distance(other.point, self.point) < safe) return false;
        }
        return true;
    }

    registerUse("moonlight", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            var self = source(context);
            // 灼伤优先：满血着火也要熄火，不能被缺血阈值或天色挡在门外。
            if (status(context, self, "burn")) return true;
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(self);
            if (health >= below) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            // 晴夜强档是驻足承月：月色可及也要有安全落脚点才长站；危急时先取保底，不为等月色错过窗口。
            if (PokemonSkills.moonlightSkyAt(world(context), point(self.point)))
                return health < below * 0.5 || moonlightWindow(context);
            return health < below * 0.5;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
