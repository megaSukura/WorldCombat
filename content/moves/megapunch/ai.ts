/**
 * 百万吨重拳 / megapunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 5）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferWounded`（默认开）打开时残血目标排得更前——一发定音；目标已经站进射程时再加一档。
 * 够不到怎么办：拳程很短，`reach` 之内才动手，不够先贴近。
 * 放完之后：把被推开的对手交回共享交战计划（推离队友或推出掩体由队友接手）。
 */
namespace PokemonSkills {
    function megapunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
    }

    CompanionBehavior.registerUse("megapunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return megapunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !megapunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "preferWounded", true) && CompanionBehavior.ratio(target) < 0.5) score += 12;
            if (distance <= capability.data.range * 0.7) score += 6;
            if (context.facts.grounded) score += 4;
            const planted = CompanionBehavior.ai<boolean>(capability, "planted", false);
            if (planted) {
                // 扎根式收招长，挑一个有安全起手窗口的目标：对方正咬着别人、或刚被打得踉跄时才值得停步出拳。
                const busyElsewhere = !!target.attacking && target.attacking !== self.ref;
                if (busyElsewhere || target.hurtAgo < 20) score += 6;
                else if (target.attacking === self.ref) score -= 8;
            }
            return score;
        }
    });

    addPreferences("megapunch", {}, [
        field(pathOf("planted"), "扎根式", "boolean", {
            help: "开启：这一拳更沉（威力 ×1.14）、推得更远（×1.25），但蓄势更久、收招更慢、冷却更长——一发定音。关闭（活步式）：起收更快、循环更短，但拳轻、推得近，适合持续压制。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。直拳射程短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferWounded"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一记定音重拳收尾；关闭则所有目标同价。"
        })
    ]);
}
