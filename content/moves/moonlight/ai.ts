/**
 * 月光 的伙伴 AI：它是一口靠夜色吃饭的回复，也能熄掉灼伤，所以 AI 先看有没有火，再谈天色。
 *
 * 何时考虑：身上带着灼伤（共享身份 burn）时立即排进恢复计划——哪怕满血也要把火熄掉；否则等生命低于
 *   ai.healBelow（默认 0.7）再排。
 * 等夜：ai.waitForSky（默认开）打开时只在「月色可及」时出手——执行、说明与 AI 共用同一个 moonlightSkyAt
 *   真事实（夜晚 × 可见天空 × 无雨），不再用「日照偏低」伪推月光，所以白天洞穴不会被误判成晴夜强档。
 *   关闭后白天也照用，只拿保底回复。等待中若生命已跌到回复阈值一半以下，先取保底，不为等月色错过窗口。
 * 对谁出手：只有自己（kind self），reach 0；判断对任意主体的身份与亲密度缺省沿用中性基准，不因普通模组生物而崩公式。
 * 放完之后：生命补进来并冷却掉灼伤（若身上有），随后交回共用交战计划。
 */
namespace CompanionBehavior {
    const moonlightBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    moonlightBelow.help = "没有灼伤时，自身生命低于该比例才把月光排进恢复计划；调低更倾向硬撑，调高则一掉血就承月。身上有灼伤时无视此值，优先熄火。";
    const moonlightSky = PokemonSkills.flag("ai.waitForSky", "等月色");
    moonlightSky.help = "开启：只在月色可及（夜晚晴空）时出手，白天把这招留着；关闭：受伤就照用，接受保底回复。有灼伤需要熄火时不受此限。";

    PokemonSkills.addPreferences("moonlight", { ai: { healBelow: 0.7, waitForSky: true } }, [moonlightBelow, moonlightSky]);

    registerUse("moonlight", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            var self = source(context);
            // 灼伤优先：满血着火也要熄火，不能被缺血阈值挡在门外。
            if (status(context, self, "burn")) return true;
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(self);
            if (health >= below) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            if (PokemonSkills.moonlightSkyAt(world(context), point(self.point))) return true;
            return health < below * 0.5;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
