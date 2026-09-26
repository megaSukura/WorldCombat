/**
 * 愤怒粉 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有看得见的威胁、自己不是骑乘状态、身边 ai.watch 内有至少一个活着的同伴
 *   （原生的 onTry 同样要求这边不止一只），并且自己身上还没有这团粉。
 * 对谁出手：自己施放、落点是自己身前（共享掩护计划把落点朝威胁方向挪一小段），用来保护后排的撤退通道。
 * 什么时候最急：同伴生命低于 ai.allyBelow、而自己还在 ai.healthFloor 以上——能替它拦住追兵就先撒（priority 100）；
 *   否则 40，在共享的「掩护」次序里把通道封住。
 * 够不到怎么办：落点由本招的撒粉距离（随特攻）决定，自己站在通道口即可，不需要贴身。
 * 放完之后：粉云留在原地，自己可以走开继续交战；粉还在时不重复撒。
 * 与「看我嘛」分开：这里没有全局的脚本化仇恨偏置——牵引只由真正入云时那一次原生请求触发，位置经营才是这招的重点。
 * 配置：thick（浓粉／薄粉）改变半径、再次入云冷却与存续；ai.watch、ai.allyBelow、ai.healthFloor 决定出手条件。
 */
namespace CompanionBehavior {
    const ragePowderWatch = PokemonSkills.number("ai.watch", "照看半径", 2, 16, 1);
    ragePowderWatch.help = "伙伴只在这么远以内有活着的同伴时才撒粉；调小只在贴身时撒，调大愿意替更远的同伴挡一挡。";
    const ragePowderAllyBelow = PokemonSkills.number("ai.allyBelow", "同伴告急血量", 0.1, 0.9, 0.05);
    ragePowderAllyBelow.help = "同伴生命低于这个比例时，撒粉算紧急（优先越过普通交战）；调高更爱护人，调低只在同伴快倒下时才撒。";
    const ragePowderHealthFloor = PokemonSkills.number("ai.healthFloor", "自身安全血量", 0.2, 0.9, 0.05);
    ragePowderHealthFloor.help = "自己生命低于这个比例就不再把敌人往自己这边引；调低更敢替人挨打，调高更先保自己。";

    PokemonSkills.addPreferences("ragepowder", { thick: false, ai: { watch: 8, allyBelow: 0.5, healthFloor: 0.35 } },
        [ragePowderWatch, ragePowderAllyBelow, ragePowderHealthFloor]);

    function ragePowderCrowd(context: WorldBehavior.Context, watch: number): Entity[] {
        const self = source(context), nearby = context.facts.nearby as Entity[], found: Entity[] = [];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === self.ref || !other.friendly || other.health <= 0) continue;
            if (distance(other.point, self.point) <= watch) found.push(other);
        }
        return found;
    }

    registerUse("ragepowder", {
        protocols: ["world_combat:cover"],
        reach: function (_context, item) { return item.data.range; },
        ready: function (context) { return !status(context, source(context), "ragepowder"); },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            if (!context.senses["world_combat:threat"]) return false;
            if (status(context, source(context), "ragepowder")) return false;
            if (ratio(source(context)) < ai<number>(item, "healthFloor", 0.35)) return false;
            return ragePowderCrowd(context, ai<number>(item, "watch", 8)).length > 0;
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        priority: function (context, item) {
            const self = source(context);
            if (status(context, self, "ragepowder")) return 0;
            const crowd = ragePowderCrowd(context, ai<number>(item, "watch", 8));
            if (!crowd.length) return 0;
            const below = ai<number>(item, "allyBelow", 0.5);
            for (let index = 0; index < crowd.length; index++) if (ratio(crowd[index]) < below) return 100;
            return 40;
        }
    });
}
