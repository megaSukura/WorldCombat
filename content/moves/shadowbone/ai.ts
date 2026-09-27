/**
 * 暗影之骨 / shadowbone 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `reach` 直接取招式射程，所以它会在中远距离先手出手；`ai.spookFirst`（默认开）按目标的**当前防御等级**
 *   判断这一记还能不能继续压防：还能再降一级就抬高优先级；已经掉到底，或强化被清掉而只剩旧标记，都不被旧标记
 *   误导，降下来当普通远程攻击。贴脸时优先让近身招式处理，不抢快拳。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shadowbone", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const spook = CompanionBehavior.ai<boolean>(capability, "spookFirst", true);
            if (!spook) return 22;
            // 本次实际收益：还能把防御再压低几级（已是 -6 就没收益），不看会过期的身份标记。
            let grade = 1;
            try {
                grade = Math.max(1, Math.round(PokemonSkills.p("shadowbone", "rattleStages",
                    { world: CompanionBehavior.world(context), actor: CompanionBehavior.world(context).source(),
                        skill: PokemonSkills.skills["shadowbone"], detail: { values: capability.data.config || {} } })));
            } catch (error) { }
            const gain = Math.max(0, Math.min(grade, 6 + CompanionBehavior.stage(context, target, "def")));
            if (gain <= 0) return 10;
            // 远程一记在中远处最值：贴脸时先让近身招式处理。
            return distance > 3 ? 32 : 18;
        }
    });

    addPreferences("shadowbone", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不掷骨，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.spookFirst"), "先手慑防", "boolean", {
            help: "开启：按目标当前防御等级判断——这一记还能再压一级时才优先掷骨；已经掉到底或强化被清掉就降权当普通远程攻击。关闭：一律当普通远程攻击排序。"
        })
    ]);
}
