/**
 * 替身 / substitute 的 AI 用途。
 *
 * 什么局面下出手：附近有威胁、自己还没有替身、并且付得起这一笔生命时，先立起替身再应战。
 * 落点由共享 cover 目标给出大致方向（挡在威胁方向或靠近主人），本招再把它收回到施法者自己站得住的位置：
 * 替身跟本体挨在一起，才能保持联系、也才不会落到敌人的脚下。已有替身时不重放。
 * `ai.useBelow` 决定「伤到多少才立」——默认满血也立（更早得到保护，也更早付出生命）；
 * `ai.reserveHealth` 是付完之后给自己留的保底比例，越低越敢拼。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("substitute", {
        protocols: ["world_combat:cover"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            var self = CompanionBehavior.source(context);
            if (!context.senses["world_combat:threat"]) return false;
            if (CompanionBehavior.status(context, self, "substitute")) return false;
            if (CompanionBehavior.ratio(self) > CompanionBehavior.ai<number>(capability, "useBelow", 1.0)) return false;
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.35);
            var cost = 0.25 * (capability.data.config && capability.data.config.build ? Number(capability.data.config.build) : 1);
            return CompanionBehavior.ratio(self) > cost + reserve;
        },
        accepts: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0);
        },
        /** Keep the double by the user's own feet: that spot is walkable by definition and stays linked. */
        target: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            var copy: any = JSON.parse(JSON.stringify(target));
            var dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            var length = Math.sqrt(dx * dx + dz * dz);
            var reach = Math.min(0.7, length);
            if (length > 0.01) copy.point = [self.point[0] + dx / length * reach, self.point[1], self.point[2] + dz / length * reach];
            else copy.point = self.point.slice();
            return copy;
        },
        priority: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            // 快被压死时抢在攻击前先立替身。
            return CompanionBehavior.ratio(self) < 0.5 ? 60 : 0;
        }
    });

    addPreferences("substitute", {}, [
        field(pathOf("ai.useBelow"), "生命低于多少才立", "number", {
            min: 0.3, max: 1.0, step: 0.05,
            help: "生命比例高于它时不主动立替身。默认 1.0 表示一见到威胁就先立；调低后只在受伤时才用，把生命留给别的打法。"
        }),
        field(pathOf("ai.reserveHealth"), "付完保留的生命", "number", {
            min: 0.1, max: 0.7, step: 0.05,
            help: "支付生命后至少要留下的比例；越高越谨慎，付不起时不会施放。"
        }),
        field(pathOf("ai.placement"), "替身站位", "choice", {
            options: [{ value: "towardThreat", label: "挡在威胁方向" }, { value: "nearOwner", label: "靠近主人" }],
            help: "替身放在自己与威胁之间，还是靠近主人身边；两种站位应对的敌人方向不同。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为立替身而挪位；关闭则只在原地够得到时施放。"
        })
    ]);
}
