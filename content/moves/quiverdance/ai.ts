/**
 * 蝶舞 / quiverdance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、在 ai.maxChase 内、且至少一项还能真的抬级时，才考虑先扬一层鳞幕再打。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 100 越过共享交战次序；以特殊攻击为主、或正被压得
 *   只剩七成血以下时抬到 108——前者吃满特攻，后者正需要特防和速度撑住。不追敌，只在空隙里短舞。
 * 已有剩余窗：鳞幕还在身上时不再频繁重复起舞——只有还能补两三项级数才维持高优先，否则交回共享交战次序。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。会给动作一个指向威胁的明确瞄向，方便身体朝向战局侧步。
 * 放完之后：舞完最后一拍才三各 +1、身上挂着鳞幕；幕还在且三项都已到上限时不再重复起舞。
 */
namespace PokemonSkills {
    /** 还能从这次舞里真正抬起的项数；已到 6 级的项不计。 */
    function quiverdanceGainable(context: WorldBehavior.Context): number {
        const self = CompanionBehavior.source(context);
        let gainable = 0;
        ["spa", "spd", "spe"].forEach(function (stat) { if (CompanionBehavior.stage(context, self, stat) < 6) gainable++; });
        return gainable;
    }

    CompanionBehavior.registerUse("quiverdance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (quiverdanceGainable(context) === 0) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 16)) return false;
            return gap >= CompanionBehavior.ai<number>(capability, "minGap", 2);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        // 自施放只借这个对象定出朝向，宿主仍以自身为动作实体。
        target: function (context) {
            return context.senses["world_combat:threat"];
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const gainable = quiverdanceGainable(context);
            if (gainable === 0) return 0;
            const focused = (context.facts.specialAttack || 0) >= (context.facts.attack || 0);
            const pressured = CompanionBehavior.ratio(self) < 0.7;
            let score = focused || pressured ? 108 : 100;
            // 幕还在时只把还能明显补级的重舞算作紧急；否则交回共享交战次序，不再频繁压过攻击。
            if (CompanionBehavior.status(context, self, "quiverdance") && gainable < 3) score = Math.min(score, 70);
            return score;
        }
    });

    addPreferences("quiverdance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑先扬鳞；越大越早开始铺幕。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
