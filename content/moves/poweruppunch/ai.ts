/**
 * 增强拳 / poweruppunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 为什么先出手：这是一记起势拳——还没戴上「拳已变硬」（`world_combat:status/hardened`）时 priority 34，
 *   先把物攻垫起来，对残血小目标更愿意用它热身。
 * 满级后怎么维护：窗口实际增益已到 +6 且剩余还长时让位给更重的招；只在临近结束（不足约 3 秒）时才回来补一拳续期，
 *   避免到期无端掉级。`ai.topUp`（默认开）关闭时则完全交给共享交战计划。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）；拳程很短，不够先贴近。
 */
namespace PokemonSkills {
    /** 只读窗口快照：读本招载体与它拥有的窗口贡献，供 AI 判断是否满级、是否临近结束。 */
    CompanionBehavior.registerFact("world_combat:move_poweruppunch/window", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        return poweruppunchWindow(access, actor);
    });

    /** 窗口快照的读取；缺省时按未起势处理。 */
    function poweruppunchState(context: WorldBehavior.Context, self: CompanionBehavior.Entity): { active: boolean; remaining: number; total: number } {
        const value = CompanionBehavior.fact<any>(context, "world_combat:move_poweruppunch/window", self);
        return value && value.active === true
            ? { active: true, remaining: Number(value.remaining) || 0, total: Number(value.total) || 0 }
            : { active: false, remaining: 0, total: 0 };
    }
    /** 满级且窗口还长：留给别的输出，本招不抢这一拍。 */
    function poweruppunchMaintaining(context: WorldBehavior.Context, self: CompanionBehavior.Entity): boolean {
        const window = poweruppunchState(context, self);
        return window.active && window.total >= 6 && window.remaining > 60;
    }

    CompanionBehavior.registerUse("poweruppunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "hardened") && !CompanionBehavior.ai<boolean>(capability, "topUp", true)) return false;
            if (poweruppunchMaintaining(context, self)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(self.point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const window = poweruppunchState(context, self);
            if (!window.active) {
                // 起势：优先挑容易打中的近处、残血目标热身。
                let score = 34;
                if (CompanionBehavior.ratio(target) < 0.5) score += 4;
                return score;
            }
            if (!CompanionBehavior.ai<boolean>(capability, "topUp", true)) return 0;
            if (window.total >= 6 && window.remaining > 60) return 0;
            return 28;
        }
    });

    addPreferences("poweruppunch", {}, [
        field(pathOf("charge"), "蓄劲拳", "boolean", {
            help: "开启：起手更久、本拳轻 20%，但一记硬化 2 级、窗口长 40%、冷却短 20%——用时间换更陡的起势。关闭（速拳）：出手更快、本拳重 12%，但一记只硬 1 级、窗口更短、冷却更长。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。拳程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.topUp"), "起势后补拳", "boolean", {
            help: "开启：还没到顶时继续补拳叠级；满级后只在窗口临近结束时才回来续一拳。关闭则把出手机会全让给更重的招。"
        })
    ]);
}
