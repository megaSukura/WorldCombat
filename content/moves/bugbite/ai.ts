/**
 * 虫咬 / bugbite —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑。
 * 排序按“这一咬值不值”：目标持有树果时不但更优先，还按这颗果对自身的收益／反噬加权（回血、解自己身上的异常、
 *   能升的能力，正面；带刺反噬，负面），再减去「贴身咀嚼期间站着挨打」的等待风险（自己残血或旁边还有别的敌人时降权）；
 *   空手目标当一记普通接触咬击参与排序。
 * `ai.berryOnly` 开启后只在目标持有树果时出手，作为专门的吃果手段；关闭则空手时也照常补刀。
 * `devour` 属于本招配置（更重吸收、更轻这一口），不改变候选排序。
 */
namespace CompanionBehavior {
    /** 目标手里的树果；不是树果或没持有物时为 null。 */
    function bugbiteTargetBerry(context: WorldBehavior.Context, subject: WorldMethods.Subject): NativeItems.Berry | null {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return actor ? PokemonSkills.bugbiteBerryOf(world, actor) : null;
    }

    /** 这颗果吃到自己嘴里的价值：按当前体力、已有异常与能力等级估收益，带刺树果扣分。 */
    function bugbiteBerryBenefit(context: WorldBehavior.Context, berry: NativeItems.Berry): number {
        var self = CompanionBehavior.source(context), value = 0;
        if (berry.heal > 0) {
            var ratio = CompanionBehavior.ratio(self);
            value += ratio < 0.5 ? 8 : ratio < 0.8 ? 5 : ratio < 1 ? 2 : 0;
        }
        if (berry.cures && berry.cures.length)
            for (var i = 0; i < berry.cures.length; i++)
                if (CompanionBehavior.status(context, self, berry.cures[i])) { value += 8; break; }
        if (berry.boost && CompanionBehavior.stage(context, self, berry.boost === "random" ? "atk" : berry.boost) < 6) value += 4;
        if (berry.recoil > 0) value -= CompanionBehavior.ratio(self) < 0.5 ? 8 : 3;
        return value;
    }

    /** 贴身咀嚼的等待风险：自己残血，或身边还有别的活敌人时，站着嚼完这几刻更危险。 */
    function bugbiteWaitRisk(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        var self = CompanionBehavior.source(context), risk = CompanionBehavior.ratio(self) < 0.35 ? 6 : 0;
        var nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [], others = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === self.ref || other.ref === target.ref) continue;
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= 6) others++;
        }
        return risk + Math.min(6, others * 3);
    }

    registerUse("bugbite", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "berryOnly", false)) return bugbiteTargetBerry(context, target) !== null;
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var berry = bugbiteTargetBerry(context, target);
            if (berry === null) return 24;
            return Math.max(0, 52 + bugbiteBerryBenefit(context, berry) - bugbiteWaitRisk(context, target));
        }
    });

    PokemonSkills.addPreferences("bugbite", { ai: { maxChase: 10, leaveStation: false, berryOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.berryOnly", "只对携带树果者出手")
    ]);
}
