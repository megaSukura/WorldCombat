/**
 * 缩入壳中 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、且在 ai.maxChase 内时，要么威胁已进到近身距离（贴脸），要么残血（ai.panic 以下）
 *   且攻击确实临头——它正把攻击对准自己、或刚就是它打中了自己。它会把施法者钉住，所以不在近战怪还在远处、
 *   攻击尚未降临时就空缩一整个窗口。
 * 什么时候最想出手：残血且近身时 priority 120，抢在所有行动前把壳合上；残血且攻击已临头（正被瞄准，或
 *   刚被打中）给 80，近身但还不吃紧给 50，其余不给。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：壳按次挡伤，钉住期间不再重复；壳裂、到期或从 G 菜单主动松壳后才重新考虑。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("withdraw", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "withdraw")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 12)) return false;
            // 近身：威胁已经贴到身前，壳马上有用。
            if (gap <= 4) return true;
            // 残血缩壳仍要看攻击是否临头，不在近战怪还远时空缩整窗。
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.5);
            if (!(CompanionBehavior.ratio(self) < panic)) return false;
            // 当前可达攻击：这个敌人正把攻击对准自己。
            if (threat.attacking === self.ref) return true;
            // 真实入射威胁：刚就是它打中了自己。
            return typeof self.hurtAgo === "number" && self.hurtAgo < 30 && self.lastAttacker === threat.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.5);
            const endangered = CompanionBehavior.ratio(self) < panic;
            if (endangered && gap <= 4) return 120;
            if (endangered) return 80;
            return gap <= 4 ? 50 : 0;
        }
    });

    addPreferences("withdraw", {}, [
        field(pathOf("ai.maxChase"), "缩壳距离", "number", {
            min: 2, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑缩壳；越大越早在远处就收起来。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值、且攻击已经临头（正被瞄准或刚被打中）时抢在共享次序前缩壳；调高更早进入龟缩姿态，调低只在濒危时才缩。"
        })
    ]);
}
