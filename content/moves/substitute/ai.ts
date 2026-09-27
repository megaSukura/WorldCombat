/**
 * 替身 / substitute 的 AI 用途。
 *
 * 什么局面下出手：附近有威胁、自己还没有替身、并且付得起这一笔生命时，先立起替身再应战。
 * 落点由共享 cover 目标按 `ai.placement` 给出：towardThreat 挡在本体与威胁之间，nearOwner 靠近主人；
 * 本体不必走到落点上，落点本来就在施放范围内，驻守时也不会因此被迫离位。
 * 优先级与 `ready` 读同一笔生命投入：支付后留得住保底就动手，威胁越近、余量越紧越先立；不再要求残血才给分。
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
            var ratio = CompanionBehavior.ratio(self);
            if (ratio > CompanionBehavior.ai<number>(capability, "useBelow", 1.0)) return false;
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.35);
            return ratio > substituteCostShare(capability.data.config) + reserve;
        },
        accepts: function (context, capability, target) {
            var self = CompanionBehavior.source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0);
        },
        /** 本体不必站到落点上；落点由共享 cover 目标按 ai.placement（towardThreat／nearOwner）给出。 */
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, target) {
            var self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            var ratio = CompanionBehavior.ratio(self);
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.35);
            var afterPayment = ratio - substituteCostShare(capability.data.config);
            if (afterPayment <= reserve) return 0;
            // 支付后留给自己的生命越紧张、威胁越近，越该抢在挨打前先立起替身。
            var value = 40 + Math.round((1 - Math.max(0, Math.min(1, afterPayment))) * 30);
            return CompanionBehavior.distance(self.point, threat.point) <= 6 ? value + 10 : value;
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
