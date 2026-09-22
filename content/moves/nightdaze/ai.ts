/**
 * 暗黑爆破 / nightdaze 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、含空中的整圈暗波。`available` 要求有可见、敌对、存活的目标落在
 *   `ai.maxChase`（默认 8）格内，且身边 `ai.minFoes`（默认 2）个看得见的敌人才值得炸——整圈招本就该
 *   打在人堆里；不够挤就先按普通攻击处理。飞在天上的目标也算数（这招不看地面）。
 * 对谁出手：当前威胁；目标已经带着共享身份 shrouded 时降一档（重复笼罩价值低，但仍可为身边人服务）。
 * 够不到怎么办：reach 以暗波半径为准，超出先走近；站得越靠人群越好。
 * 放完之后：一圈敌人的命中一起下降、并被向外震开，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    function nightdazeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.friendly || threat.health <= 0 || !threat.visible) return false;
        if (context.facts.focus !== threat.ref
            && CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
        return nightdazeCrowd(context, CompanionBehavior.source(context), capability.data.range) >= CompanionBehavior.ai<number>(capability, "minFoes", 2);
    }

    function nightdazeCrowd(context: WorldBehavior.Context, self: CompanionBehavior.Entity, radius: number): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(nightdazeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) { return !target || nightdazeWants(context, capability, target); },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !nightdazeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = Math.min(88, 46 + (nightdazeCrowd(context, self, capability.data.range) - 1) * 9);
            if (CompanionBehavior.status(context, target, "aim_impaired")) score -= 8;
            return score;
        }
    });

    addPreferences(nightdazeId, {}, [
        field(pathOf("eclipse"), "蚀夜式", "boolean", {
            help: "开启：暗波半径 ×1.35、覆盖 +2 人、笼罩概率 +8%、笼罩时长 ×1.4，适合把一圈敌人一起罩住；代价是威力 ×0.78、起手 +4 刻、冷却 +8 刻、向外推得更轻。关闭（爆发式）：威力 ×1.12、半径 ×0.85、把贴身的推得更远，代价是笼罩概率 −6%。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动踏入人堆，先朝目标走近。越大越愿意先接近再炸。"
        }),
        field(pathOf("ai.minFoes"), "最少人数", "number", {
            min: 1, max: 5, step: 1,
            help: "以自身为心的半径里至少站着这么多敌人时才值得炸。调低更容易出手（哪怕只罩到一个），调高则更挑人堆。"
        })
    ]);
}
