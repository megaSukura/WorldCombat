/**
 * 水炮 / hydropump 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 12）格之内；更远交给共享接近逻辑。
 *   本招很贵（PP 5）且起手长，所以要挑时机，而不是随手乱轰。
 * 为什么挑扎堆的目标：水炮是**体积**——落点一圈 `backwash` 内的敌人一起吃回溅。`ai` 没有单独开关，
 *   但 priority 会对「目标身边还挤着别人」加一档，因为一炮能浇透一片。
 * 对谁出手：`ai.reserve`（默认开）打开时，残血目标降一档——把这一发重炮留给吃得住的目标，
 *   别在快死的人身上浪费 PP；关闭则所有目标同价，敢用重炮收尾。
 * 够不到怎么办：reach 就是本招射程，不够先走近；起手长，所以接近到位再出手更稳。
 * 放完之后：目标被顶开、被浇透，伙伴交回共享顺序决定继续追还是走位等冷却。
 */
namespace PokemonSkills {
    function hydropumpWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    CompanionBehavior.registerUse("hydropump", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return hydropumpWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !hydropumpWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 20;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 5;
            const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 2.6) { score += 9; break; }
            }
            if (CompanionBehavior.ai<boolean>(capability, "reserve", true) && CompanionBehavior.ratio(target) < 0.3) score -= 12;
            if (context.facts.focus === target.ref) score += 8;
            return score;
        }
    });

    addPreferences("hydropump", {}, [
        field(pathOf("deluge"), "漫灌式", "boolean", {
            help: "开启：回溅半径 ×1.5、回溅威力 ×1.2、湿身 ×1.25、散射 ×1.4，适合浇透一片；代价是洪流威力 ×0.82、速度 ×0.9、射程 −2 格、起手 +3 刻、冷却 +6 刻。关闭（冲压式）：威力 ×1.08、推距 ×1.15、准线更紧，代价是回溅范围 ×0.85，只打正前方一个。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 20, step: 1,
            help: "超过这个距离就不主动轰炮，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.reserve"), "留着打厚目标", "boolean", {
            help: "开启：目标血量低于三成时降一档分，把这一发重炮留给吃得住的目标，不在快死的人身上浪费 PP；关闭则残血目标照打，敢用重炮收尾。"
        })
    ]);
}
