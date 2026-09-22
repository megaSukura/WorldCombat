/**
 * 王者盾牌 / kingsshield 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有钢盾时立起；贴脸又残血时抬到 105 抢在共享顺序前——
 * 钢盾最厚，正是吃下致命一击的那一下。残血时优先立威仪（降攻），血厚时磐固硬挡由配置决定，AI 只按血量调优先级。
 * 变化招式会穿过钢盾，所以它不为挡变化招而起意；理由与说明一致。
 * 只剩本招时：威胁一进 `ai.range` 就会立盾。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("kingsshield", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), KingShieldRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, threat.point);
            return CompanionBehavior.ratio(self) < 0.5 && distance <= 4 ? 105 : 60;
        }
    });

    addPreferences("kingsshield", {}, [
        field(pathOf("majesty"), "威仪／磐固", "boolean", {
            help: "开启威仪：接触削攻 +1 级，但钢盾总量 ×0.8、持续 ×0.85、收招 7 刻——削得狠，挡得薄。关闭磐固：总量 ×1.25、持续 ×1.15、收招 5 刻，但削攻不额外加——挡得厚，削得轻。"
        }),
        field(pathOf("ai.range"), "立盾距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才立钢盾。越大越早摆好，也越可能空立；越小越省，但可能来不及。"
        })
    ]);
}
