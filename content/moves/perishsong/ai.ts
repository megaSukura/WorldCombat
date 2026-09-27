/**
 * 灭亡之歌 的伙伴 AI 用途：只在自己比对手更能撑、而且对手真的会留在歌域里的时候起唱。
 *
 * 什么局面有意义：有可见的威胁，自己的生命比例掉到 ai.threshold 以下（说明这一场正在输），
 *   威胁在 ai.maxChase 之内、并且此刻就站在歌域半径里、没有正在逃跑。
 * 承受预算：自己要先扛得住这一发 judge 预算（self.health > 固定伤害），才谈得上一换一。
 * 队友代价：歌域里不能有被定身、撤不掉的友方，否则就是把自己人一起写进名单。
 * 对谁出手：自己；不需要接近，由共用任务直接施放（fortify 位）。
 * 候选之间怎么排：生命更低时抬到 90，抢在普通自增益前先唱；否则 45 交回普通次序。
 * 放完之后：不再安排换下或逃逸——长动作期间的保护交给现有队友与站位，离开歌域只是脱出名单，不是这招的收尾。
 * 配置：ai.threshold 决定多被动才唱；ai.maxChase 决定威胁多近才算数；ai.leaveStation 决定驻守时是否离位。
 */
namespace CompanionBehavior {
    function perishParameter(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string): number {
        const access = world(context);
        return PokemonSkills.p(PokemonSkills.perishId, key, {
            world: access, actor: access.source(), skill: PokemonSkills.skills[PokemonSkills.perishId],
            detail: { values: capability.data.config }
        });
    }

    registerUse("perishsong", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "stay" || context.facts.intent === "hold") && !ai<boolean>(capability, "leaveStation", false)) return false;
            const self = source(context);
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat) return false;
            if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
            if (ratio(self) > ai<number>(capability, "threshold", 0.55)) return false;
            if (distance(self.point, threat.point) > ai<number>(capability, "maxChase", 12)) return false;
            const radius = perishParameter(context, capability, "songRadius");
            // 敌人要预计留在歌域里：先在圈内、且没有正在逃跑，才值得起唱。
            if (distance(self.point, threat.point) > radius) return false;
            if (fleeing(context, threat)) return false;
            // 自己得先扛得住这一发预算，才谈得上换命。
            if (!(self.health > perishParameter(context, capability, "judge"))) return false;
            // 队友的代价：圈内不能有被定身、撤不掉的友方。
            const allies = (context.facts.nearby || []) as Entity[];
            for (let i = 0; i < allies.length; i++) {
                const ally = allies[i];
                if (ally.ref !== self.ref && ally.friendly && ally.health > 0 && distance(ally.point, self.point) <= radius && bound(context, ally)) return false;
            }
            return true;
        },
        priority: function (context, _capability, _target) {
            const self = source(context);
            return ratio(self) < 0.35 ? 90 : 45;
        },
        execute: function (context, capability, target, _progress) {
            return (context.services.behavior as WorldMethods.Host).use(capability, target);
        }
    });

    PokemonSkills.addPreferences("perishsong", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.threshold"), "起唱歌量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "生命比例低于这个值才起唱；调大更早把整场拉平，调小只在真的撑不住时唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "威胁距离", "number", {
            min: 3, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑起唱；调小只在贴身时唱，调大愿意对着更远的对手唱。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去起唱。"
        })
    ]);
}
