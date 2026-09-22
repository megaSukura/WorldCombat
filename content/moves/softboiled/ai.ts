/**
 * 生蛋 的伙伴 AI：这一口先落在世界里、延迟交付，所以 AI 会在有喘息空间、或身边有受伤伙伴时动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.65）时；若开了分蛋档，身边（≤4 格）还有受伤的友方时也算有意义。
 * 对谁出手：只有自己（kind self），reach 0；受益人由 execute 在分蛋档里当场选定。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会产蛋。
 * 配置：share 布尔切换分蛋——把蛋递给附近受伤的伙伴，代价是自己拿不到这一口。
 */
namespace CompanionBehavior {
    const softboiledBelow = PokemonSkills.number("ai.healBelow", "生蛋阈值", 0.3, 0.9, 0.05);
    softboiledBelow.help = "自身生命低于该比例就产蛋自食；调低更倾向硬撑，调高则一掉血就产蛋。";
    const softboiledShare = PokemonSkills.flag("share", "分蛋");
    softboiledShare.help = "开启分蛋：把蛋递给附近受伤的伙伴，他自己按比例回复，代价是施法者拿不到这一口；关闭则留给自己。";

    PokemonSkills.addPreferences("softboiled", { share: false, ai: { healBelow: 0.65 } }, [softboiledBelow, softboiledShare]);

    registerUse("softboiled", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var self = source(context);
            if (ratio(self) < ai<number>(item, "healBelow", 0.65)) return true;
            if (!(item.data.config && item.data.config.share === true)) return false;
            var nearby = (context.facts.nearby as Entity[]) || [];
            return nearby.some(function (other) {
                return other.friendly && other.health > 0 && ratio(other) < 0.8 && distance(other.point, self.point) <= 4;
            });
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
