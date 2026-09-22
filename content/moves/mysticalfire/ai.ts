/**
 * 魔法火焰 / mysticalfire —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 12）格内；这是中远程的一发。
 * 对谁出手：`ai.cutSpecial`（默认开）打开时，优先对还没被点燃的目标出手——火焰命中会点燃并缠住不放；
 *   已经带燃烧身份的目标降到最后，避免把点燃浪费在已经烧着的人身上。关闭则按普通远程攻击排序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再吐火；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；缠身由动作自己维持，伙伴可在缠住后继续其它动作。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("mysticalfire", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cutSpecial", true)) return base;
            return CompanionBehavior.status(context, target, "burn") ? Math.max(0, base - 10) : base + 8;
        }
    });

    addPreferences("mysticalfire", {}, [
        field(pathOf("linger"), "黏焰式", "boolean", {
            help: "开启：火团更慢更短、单发略轻，但缠身时长 ×1.4、每跳更疼、点燃概率 +0.35、冷却 +6 刻，适合缠住一个慢慢磨。关闭：火团更快更远、一发打得更痛，但缠身与点燃都少。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不吐火，先走近；越大越愿意从远处先手。"
        }),
        field(pathOf("ai.cutSpecial"), "先烧没着火的", "boolean", {
            help: "开启：优先对还没被点燃的目标出手（点燃与缠身收益最大），已带燃烧的目标降到最后；关闭：当普通远程攻击排序。"
        })
    ]);
}
