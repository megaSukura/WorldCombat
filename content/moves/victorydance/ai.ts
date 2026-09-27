/**
 * 胜利之舞 / victorydance 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：即将连续作战、并且能保持进攻时，先立一场凯旋。存在威胁且在 ai.maxChase 内、
 *   又还没近到 ai.minGap 以内时，priority 越过共享交战次序（100）。
 * 什么时候最想出手：威胁血线还长、且按「起式 + 拍数 × 拍间 + 收招」估出的整段仪式能在敌人逼近前完成时给 112；
 *   敌人已在残血（<30%）时降到 90——不值得为一场长仪式投入，先普通攻击收掉；贴身逼近、来不及安全完成时给 95。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：终拍在头顶升起冠冕、攻防速各 +1；冠还在时本招不可再次起舞（available 直接返回 false），
 *   交回共享交战计划继续进攻经营——每一次命中都把窗口向上延续，直到绝对最迟结束刻才落幕。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("victorydance", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (CompanionBehavior.status(context, self, "victorydance")) return false;
            if (!threat) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            // 快死的敌人无需长投入：让普通攻击先收掉，不抢着开仪式。
            if (CompanionBehavior.ratio(threat) < 0.3) return 90;
            // 按总准备 + 拍数 × 拍间 + 收招估计整段仪式，用敌人实际逼近速度估安全间隔；来不及就不冒险。
            const world = CompanionBehavior.world(context);
            const facts = { world: world, actor: world.source(), detail: { values: capability.data.config || {} } };
            const ceremony = Math.round(p("victorydance", "tempo", facts))
                + Math.round(p("victorydance", "beats", facts)) * Math.round(p("victorydance", "pace", facts))
                + Math.round(p("victorydance", "aftercast", facts));
            const v = CompanionBehavior.velocity(context, threat);
            if (v) {
                const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
                const length = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const closing = (v[0] * dx + v[2] * dz) / length;
                if (closing > 0.01 && gap / closing < ceremony) return 95;
            }
            return 112;
        }
    });

    addPreferences("victorydance", {}, [
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑开仪典；越大越早开始立冠。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再起舞、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
