/**
 * 偷懒 的伙伴 AI：这一口起手最快，但代价是随后的机动力——所以它偏好「打完这一口就有喘息空间」的场面。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.6）且还没到满血，且此刻没有正处在倦怠里（否则只是白拖自己）。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：0，落在共用顺序的恢复环节；阈值刻意低于同族——因为它换出去的是接下来的移动力，不该一掉血就用。
 * 配置：deep 布尔切换酣睡——回复更多、倦怠更久；关闭打盹则补得少一点、几息就缓过来。
 */
namespace CompanionBehavior {
    const slackoffBelow = PokemonSkills.number("ai.healBelow", "偷懒阈值", 0.3, 0.9, 0.05);
    slackoffBelow.help = "自身生命低于该比例才就地偷懒；调低更倾向硬撑，调高则一掉血就摊下。";
    const slackoffDeep = PokemonSkills.flag("deep", "酣睡");
    slackoffDeep.help = "开启酣睡：回复总量 +0.06、倦怠时长 ×1.4，代价是机动空窗更久；关闭打盹：补得少一点、几息就缓过来。";

    PokemonSkills.addPreferences("slackoff", { deep: false, ai: { healBelow: 0.6 } }, [slackoffBelow, slackoffDeep]);

    registerUse("slackoff", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var self = source(context);
            if (CompanionBehavior.status(context, self, "loafing")) return false;
            return ratio(self) < ai<number>(item, "healBelow", 0.6);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
