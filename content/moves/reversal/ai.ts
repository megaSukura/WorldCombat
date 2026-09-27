/**
 * 起死回生 / reversal 的 AI 用途。
 *
 * 什么局面下出手：它是一记格斗系的身前扇面反打，任何血量都能用；威力与扇面 reach 都随自己已损失的生命上涨。
 * 非拼命式没有自损，生命比例跌到 `ai.desperate` 以下时把这招当主力抢在别的输出前反打（伤势本身让这一顶更重）。
 * 拼命式要按最大生命付 8% 反噬：AI 用真实血值估「这一顶之后还剩多少血」和击杀收益——付完这笔会掉到危险线
 * 以下就不出手，**不会仅因为自己残血就自动鼓励自杀**；只有对手已残、且付完这笔仍留有余地时才为收尾加分。
 * 目标可见、敌对、活着且在 `ai.maxChase` 之内。
 * 它是身前扇面而非全周清场：AI 只把它对准面前的目标，背后围上来的敌人不会被当成一次清场机会。
 */
namespace PokemonSkills {
    function reversalValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 拼命式一次反噬比例（默认真实自损 8%）。 */
    function reversalRecoil(context: WorldBehavior.Context): number {
        const value = Number(p("reversal", "recoil", CompanionBehavior.world(context)));
        return isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.08;
    }

    CompanionBehavior.registerUse("reversal", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!reversalValid(target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            // 拼命式：付不起这笔反噬就不主动扑。
            if (capability.data.config && capability.data.config.reckless === true) {
                const self = CompanionBehavior.source(context);
                const after = self.health - Math.max(1, self.maximum) * reversalRecoil(context);
                if (after < Math.max(1, self.maximum * 0.15)) return false;
            }
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const ratio = CompanionBehavior.ratio(self);
            const reckless = !!(capability.data.config && capability.data.config.reckless === true);
            let value = 22;
            if (!reckless) {
                // 无自损：低血放大是这招本身的真实收益，按背水阈值提前兑现。
                if (ratio <= CompanionBehavior.ai<number>(capability, "desperate", 0.55)) value = 70 + Math.round((1 - ratio) * 50);
            } else {
                // 拼命式：按真实剩余生命估生存成本，残血不再自动抬分。
                const maximum = Math.max(1, self.maximum);
                const after = self.health - maximum * reversalRecoil(context);
                value = 22 + Math.round(Math.max(0, 1 - ratio) * 16);
                value -= Math.round(Math.max(0, 1 - after / maximum) * 30);
                if (after >= maximum * 0.25 && CompanionBehavior.ratio(target) <= 0.3) value += 14;
            }
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) value += 10;
            return Math.max(1, value);
        }
    });

    addPreferences("reversal", {}, [
        field(pathOf("reckless"), "拼命式", "boolean", {
            help: "开启：威力再抬一截，但每次打中后自己按最大生命扣掉 8%，残血时可能因此倒下、也可能因此把下一记推到更高；关闭：没有反噬。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动扑上去，先走近。越大追击越执着。"
        }),
        field(pathOf("ai.desperate"), "背水阈值", "number", {
            min: 0, max: 1, step: 0.05,
            help: "非拼命式时，自己生命比例不高于这个值就把这招当主力抢在别的输出前反打（伤势让这一顶更重）；调低则只在更危险时才优先用它。拼命式不按这个阈值抬分，改看付完反噬后的剩余生命。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成半时再抬一档优先级；关闭：只按普通近身候选参与排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为喷发离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
