/**
 * 啄食 / pluck —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * 对谁出手：目标持有树果时最优先，并按这颗果对自身的收益／反噬加权（回血、解自己身上的异常、能升的能力，
 *   正面；带刺反噬，负面）；浮空或站高处、在「长喙距离 + 抬升」可达范围内的对手加分（仰喙正是本招的用法）；
 *   空手平地目标当一记普通远程啄击参与排序。
 * 接近距离仍取横向喙长：喙只有朝上瞄准才伸长，横向真实够到的仍是 reach，AI 不会因为抬升加成而在水平方向虚报射程。
 * 保持原地可触及才出手：本招本身不扑进也不回撤，靠近到射程由共享接近逻辑完成，不需要冲入近战。
 * `ai.berryOnly` 开启后只在目标持有树果时出手，作为专门的吃果手段；关闭则空手时也照常啄。
 * `outreach` 属于本招配置（更远更高但更轻），不改变候选排序。
 */
namespace CompanionBehavior {
    /** 目标手里的树果；不是树果或没持有物时为 null。 */
    function pluckTargetBerry(context: WorldBehavior.Context, subject: WorldMethods.Subject): NativeItems.Berry | null {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return actor ? PokemonSkills.pluckBerryOf(world, actor) : null;
    }

    /** 这颗果吃到自己嘴里的价值：按当前体力、已有异常与能力等级估收益，带刺树果扣分。 */
    function pluckBerryBenefit(context: WorldBehavior.Context, berry: NativeItems.Berry): number {
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

    /** 目标高于自身且在「reach + lift」可达范围内时才加仰角分；够不到的空中目标不因高度加分。 */
    function pluckElevationBonus(context: WorldBehavior.Context, subject: WorldMethods.Subject): number {
        var self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        var rise = subject.point[1] - self.point[1];
        if (rise <= 0.5) return 0;
        var reach = Number(PokemonSkills.p("pluck", "reach", world)), lift = Number(PokemonSkills.p("pluck", "lift", world));
        if (!isFinite(reach) || !isFinite(lift)) return rise > 1 ? 10 : 4;
        var dx = subject.point[0] - self.point[0], dz = subject.point[2] - self.point[2], flat = Math.sqrt(dx * dx + dz * dz);
        return flat <= reach + lift && rise <= reach + lift ? (rise > 1 ? 10 : 4) : 0;
    }

    registerUse("pluck", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) {
            // 横向真实喙长；仰角附加只用于候选加分，不在水平方向虚报接近距离。
            var reach = Number(PokemonSkills.p("pluck", "reach", CompanionBehavior.world(context)));
            return isFinite(reach) && reach > 0 ? reach : item.data.range;
        },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "berryOnly", false)) return pluckTargetBerry(context, target) !== null;
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var berry = pluckTargetBerry(context, target);
            var score = berry !== null ? 52 + pluckBerryBenefit(context, berry) : 22;
            return score + pluckElevationBonus(context, target);
        }
    });

    PokemonSkills.addPreferences("pluck", { ai: { maxChase: 14, leaveStation: false, berryOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 18, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.berryOnly", "只对携带树果者出手")
    ]);
}
