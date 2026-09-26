/**
 * 看我嘛 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有看得见的威胁、自己不是骑乘状态、身边 ai.watch 内有至少一个还活着的同伴
 *   （原生的 onTry 同样要求这边不止一只），并且自己身上还没有这声招呼。
 * 对谁出手：自己（kind self），reach 0；已经有招呼时不再重复喊。
 * 会不会有人回应：这声招呼只在喊话半径内存在可被转向的敌人（非友方、活着、非玩家）时才算有意义——没人可回应就把
 *   优先级压低，让共享交战次序先用别的行动；能不能真的被接受仍由命中层的原生请求决定（拒绝转向的 Boss 就是接受不了）。
 * 什么时候最急：同伴生命低于 ai.allyBelow、而自己还在 ai.healthFloor 以上——能替它挡就先挡（priority 100）；
 *   否则 40，在共享的「掩护」次序里顺手把注意引过来。
 * 够不到怎么办：范围就是自己的喊话半径（由等级与特攻决定），不需要接近谁。
 * 放完之后：接受者注意留在自己身上，伙伴交回共享顺序继续交战；招呼还在时不重复喊。
 * 配置：shout（喊话／招手）改变范围与时长；ai.watch、ai.allyBelow、ai.healthFloor 决定出手条件。
 */
namespace CompanionBehavior {
    const followMeWatch = PokemonSkills.number("ai.watch", "照看半径", 2, 16, 1);
    followMeWatch.help = "伙伴只在这么远以内有活着的同伴时才喊话；调小只在贴身时招呼，调大愿意替更远的同伴引开火力。";
    const followMeAllyBelow = PokemonSkills.number("ai.allyBelow", "同伴告急血量", 0.1, 0.9, 0.05);
    followMeAllyBelow.help = "同伴生命低于这个比例时，吼一嗓子算紧急（优先越过普通交战）；调高更爱护人，调低只在同伴快倒下时才喊。";
    const followMeHealthFloor = PokemonSkills.number("ai.healthFloor", "自身安全血量", 0.2, 0.9, 0.05);
    followMeHealthFloor.help = "自己生命低于这个比例就不再把火力往身上引；调低更敢替人挨打，调高更先保自己。";

    PokemonSkills.addPreferences("followme", { shout: false, ai: { watch: 8, allyBelow: 0.5, healthFloor: 0.35 } },
        [followMeWatch, followMeAllyBelow, followMeHealthFloor]);

    function followMeCrowd(context: WorldBehavior.Context, watch: number): Entity[] {
        const self = source(context), nearby = context.facts.nearby as Entity[], found: Entity[] = [];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || !other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) <= watch) found.push(other);
        }
        return found;
    }

    /** 喊话半径内、可能被这声招呼拉住的敌人；读本招自己的 callRadius，读不到就退回中性估计。 */
    function followMeResponders(context: WorldBehavior.Context): number {
        const self = source(context);
        let radius = 8;
        try { radius = Math.max(3, Math.min(14, PokemonSkills.p("followme", "callRadius", world(context)))); } catch (error) { radius = 8; }
        let found = 0;
        const nearby = context.facts.nearby as Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || other.friendly || other.player || !(other.health > 0)) continue;
            if (distance(other.point, self.point) <= radius) found++;
        }
        return found;
    }

    registerUse("followme", {
        protocols: ["world_combat:cover"],
        reach: function () { return 0; },
        ready: function (context) { return !status(context, source(context), "followme"); },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if (status(context, source(context), "followme")) return false;
            if (ratio(source(context)) < ai<number>(item, "healthFloor", 0.35)) return false;
            return followMeCrowd(context, ai<number>(item, "watch", 8)).length > 0;
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        priority: function (context, item) {
            const self = source(context);
            if (status(context, self, "followme")) return 0;
            const crowd = followMeCrowd(context, ai<number>(item, "watch", 8));
            if (!crowd.length) return 0;
            // 没有人可能被拉向自己时，这声招呼没有落点，交给别的行动。
            if (followMeResponders(context) <= 0) return 10;
            const below = ai<number>(item, "allyBelow", 0.5);
            for (let index = 0; index < crowd.length; index++) if (ratio(crowd[index]) < below) return 100;
            return 40;
        }
    });

    /** 被招呼者进入共享威胁排序，脚本化的伙伴/野生 AI 也会被这声喊吸引。 */
    targetPriority("followme-draw", function (candidate) {
        if (status(candidate.context, candidate.subject, "followme")) { candidate.qualifies = true; candidate.score -= 60; }
    });
}
