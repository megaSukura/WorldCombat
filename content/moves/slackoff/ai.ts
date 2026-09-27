/**
 * 偷懒 的伙伴 AI：这一口起手最快，但代价是随后的机动力——所以它偏好「打完这一口就有喘息空间」的场面。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.6）且还没到满血，且此刻没有正处在倦怠里（否则只是白拖自己）。
 * 还要估算逃生空间：离最近的、看得见的敌人少于 ai.escapeGap（默认 6 格）时不摊下——拖着慢步留在敌人身边只会更危险。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：0，落在共用顺序的恢复环节；阈值刻意低于同族——因为它换出去的是接下来的移动力，不该一掉血就用。
 * 配置：deep 布尔切换深歇——回复更多、倦怠更久；关闭浅歇则补得少一点、几息就缓过来。
 */
namespace CompanionBehavior {
    const slackoffBelow = PokemonSkills.number("ai.healBelow", "偷懒阈值", 0.3, 0.9, 0.05);
    slackoffBelow.help = "自身生命低于该比例才就地偷懒；调低更倾向硬撑，调高则一掉血就摊下。";
    const slackoffEscape = PokemonSkills.number("ai.escapeGap", "逃生余量", 2, 16, 1);
    slackoffEscape.help = "就地偷懒会拖慢脚步，离最近的敌人至少隔这么远才用它；调大只在对手够不到时偷懒，调小则敢在贴身时摊下。";
    const slackoffDeep = PokemonSkills.flag("deep", "深歇");
    slackoffDeep.help = "开启深歇：回复总量 +0.06、倦怠时长 ×1.4，代价是机动空窗更久；关闭浅歇：补得少一点、几息就缓过来。";

    PokemonSkills.addPreferences("slackoff", { deep: false, ai: { healBelow: 0.6, escapeGap: 6 } }, [slackoffBelow, slackoffEscape, slackoffDeep]);

    registerUse("slackoff", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var self = source(context);
            if (CompanionBehavior.status(context, self, "loafing")) return false;
            if (ratio(self) >= ai<number>(item, "healBelow", 0.6)) return false;
            var gap = ai<number>(item, "escapeGap", 6);
            var nearby = context.facts.nearby || [];
            for (var i = 0; i < nearby.length; i++) {
                var other = nearby[i];
                if (!other || other.friendly || !other.visible || !(other.health > 0)) continue;
                if (distance(other.point, self.point) < gap) return false;
            }
            return true;
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
