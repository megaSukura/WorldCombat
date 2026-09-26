/**
 * 忍耐 / bide 的伙伴 AI 用途。
 *
 * 什么局面下出手：有可见威胁、自己生命高于 ai.minHealth（默认 0.5）、身上还没在忍时进入架势——
 *   它是一段站定挨打的窗口，血量太低时开忍只会白送。威胁正在打自己时 priority 抬到 90（抢在被打前收势），
 *   否则 45。站定期间不能出手，所以只在有敌意的时候才用。
 * 对谁出手：只有自己（kind self），reach 0；还手自动打向最后打自己的人。
 * 放完之后：忍耐自动在 window 刻后结账，伙伴按共用计划继续交战；AI 不重复开架势。
 * 配置：rooted 布尔决定扎根（更长更重、定身）还是且战（更短、可走位）。
 * 说明：这是《忍耐》。与双倍奉还（只认物理、主动迎击）、镜面反射（只认特殊、隔空射回）分开：
 *   忍耐全吃、要站定、时间到自动还手。
 */
namespace PokemonSkills {
    CompanionBehavior.readFacts("world_combat:move_bide/ai-fact", function (frame, access) {
        const actor = access.source();
        const record = bideRead(access, actor);
        frame.facts.bideCharging = record !== null && record.active;
        frame.facts.bideCharge = record === null ? 0 : record.amount;
    });

    CompanionBehavior.registerUse(bideId, {
        protocols: ["world_combat:survive"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (context.facts.bideCharging === true) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.ratio(CompanionBehavior.source(context))
                > CompanionBehavior.ai<number>(capability, "minHealth", 0.5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            // 正被点名时抢先收势；刚挨过一记也说明对手在持续输出，值得开一次账。
            if (threat.attacking === self.ref) return 90;
            return self.hurtAgo < 40 ? 65 : 45;
        }
    });

    addPreferences(bideId, { rooted: true, ai: { minHealth: 0.5 } }, [
        field(pathOf("rooted"), "扎根硬忍", "boolean", {
            help: "开启：忍耐架势站得更久、还手倍率更高，但这段时间不能走动（扎根定身）。关闭：且战且忍，可以走位，代价是窗口更短、还手更轻。"
        }),
        field(pathOf("ai.minHealth"), "忍耐血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "生命比例高于这个值才开忍耐。越大越保守、满血也可能站定挨打；越小越省，但可能血太少还没结账就先倒。"
        })
    ]);
}
