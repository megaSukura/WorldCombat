/**
 * 茶会 的伙伴 AI：这是一张摆在对手脚下的茶席，招呼圈里所有带树果的人吃掉自己那颗。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 12）以内；AI 以该威胁的位置为落点摆茶，所以先看圈里
 *   有多少带树果的人。`ai.stripFoes`（默认开启）要求圈里至少有一个**敌人**带树果——茶会的主要用途是把对手
 *   保命或反击的果子提前掀掉；关闭后只要圈里有足够多的人带树果就摆，也用来给队友的果子触发。
 * 对谁出手：当前威胁的位置；由共享任务把身体带进摆席距离（reach）内，再以该点为中心摆茶。
 * 候选之间怎么排：威胁自己带果子时 priority 最高（70）；圈里有其他敌人带果子 60；只够触发队友 30。
 * 放完之后：圈里所有带树果的人各吃一颗（敌友都算），茶席与茶气留在原地一段时间，交回共享顺序。
 * 配置：grand 在参数层换「盛宴」与「便茶」；ai.minHolders / ai.stripFoes 是出手门槛。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_teatime/berry", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        return PokemonSkills.teatimeHoldsBerry(access, actor);
    });

    function teatimeHolds(context: WorldBehavior.Context, target: Entity): boolean {
        return !!CompanionBehavior.fact<boolean>(context, "world_combat:move_teatime/berry", target);
    }
    function teatimeCounts(context: WorldBehavior.Context, centre: number[], radius: number): { holders: number; foes: number } {
        const self = source(context), access = world(context), selfActor = access.actor(self.ref);
        let holders = 0, foes = 0;
        if (selfActor && PokemonSkills.teatimeHoldsBerry(access, selfActor)) holders++;
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, centre) > radius) continue;
            if (!teatimeHolds(context, other)) continue;
            holders++;
            if (!other.friendly) foes++;
        }
        return { holders: holders, foes: foes };
    }

    const teatimeHolders = PokemonSkills.number("ai.minHolders", "开席门槛", 1, 5, 1);
    teatimeHolders.help = "茶席圈里至少这么多个带树果的人才值得开席；调到 1 有一颗就摆，调高则等更多人一起把果子吃掉。";
    const teatimeChase = PokemonSkills.number("ai.maxChase", "摆席距离", 3, 20, 1);
    teatimeChase.help = "威胁进入这个距离内才考虑摆茶；调小只在贴身时摆，调大愿意提前围过去。";
    const teatimeStrip = PokemonSkills.flag("ai.stripFoes", "只对带果子的敌人开席");
    teatimeStrip.help = "开启：只有茶席圈里至少有一个敌人带着树果时才摆，专门掀对手的果子；关闭：只要圈里带果子的人够多就摆，也用来触发队友的果子。";

    PokemonSkills.addPreferences("teatime", {}, [teatimeHolders, teatimeChase, teatimeStrip]);

    registerUse("teatime", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.friendly || threat.health <= 0 || !threat.visible) return false;
            const self = source(context);
            if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            const access = world(context), actor = access.actor(self.ref);
            const radius = actor ? PokemonSkills.teatimeRadius(access, actor) : 4.0;
            const counts = teatimeCounts(context, threat.point, radius);
            if (counts.holders < ai<number>(item, "minHolders", 1)) return false;
            if (ai<boolean>(item, "stripFoes", true) && counts.foes === 0) return false;
            return true;
        },
        accepts: function (_context, _item, target) { return target.health > 0; },
        priority: function (context, item, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            if (teatimeHolds(context, threat)) return 70;
            const self = source(context), access = world(context), actor = access.actor(self.ref);
            const radius = actor ? PokemonSkills.teatimeRadius(access, actor) : 4.0;
            const counts = teatimeCounts(context, threat.point, radius);
            if (counts.foes > 0) return 60;
            return counts.holders > 0 ? 30 : 0;
        }
    });
}
