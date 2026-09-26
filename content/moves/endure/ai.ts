/**
 * 挺住 / endure 的 AI 用途。
 *
 * 什么局面下出手：有威胁、自己生命比例跌到 `ai.threshold` 以下、身上还没有挺住窗口时咬牙；
 * 血量更低、威胁已贴身或正把矛头指向自己时抬到 120，一定抢在共享顺序前——这是保命招。满血时不会空放。
 * 窗口不再定身，挺住后仍可走位，交给已有的撤退／生存策略继续。
 * 只剩本招时：血量掉到阈值就会被提出，落回共享游走直到受伤。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("endure", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), EndureRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) <= CompanionBehavior.ai<number>(capability, "threshold", 0.35);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
            if (!threat) return 0;
            const distance = CompanionBehavior.distance(self.point, threat.point);
            const pressed = threat.attacking === self.ref || distance <= 2.5;
            return CompanionBehavior.ratio(self) < 0.2 || pressed ? 120 : 70;
        }
    });

    addPreferences("endure", {}, [
        field(pathOf("scramble"), "挣扎／屹立", "boolean", {
            help: "开启挣扎：窗口 ×0.75，但全程可以移动，收招 12 刻、没有力竭。关闭屹立：窗口 ×1.25，整段定身，用掉次数后力竭 30 刻，收招 6 刻。"
        }),
        field(pathOf("ai.threshold"), "保命血量", "number", {
            min: 0.1, max: 0.6, step: 0.05,
            help: "生命比例低于这个值才咬牙。越大越保守、越早用掉 PP；越小越省，但可能来不及。"
        })
    ]);
}
