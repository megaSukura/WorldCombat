/**
 * 茶会 的伙伴 AI：这是一张摆在对手脚下的茶席，招呼圈里所有带树果的人吃掉自己那颗。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 12）以内；AI 以该威胁的位置为落点摆茶，先数圈内
 *   实际可见、且茶香能直达（不隔墙）的带树果者。`ai.stripFoes`（默认开启）时，掀对手果子只在对方**满血**时
 *   才真的划算——满血敌人的回复果被浪费，而残血敌人被这一口救回来是净亏；关闭后更看重圈内友方能立刻吃到的收益。
 * 对谁出手：当前威胁的位置；由共享任务把身体带进摆席距离（reach）内，再以该点为中心摆茶。
 * 候选之间怎么排：友方每个持果者计一份即时收益；每个满血持果敌人计一份拆解收益；纯粹"敌人带着果子"不再自动加分。
 * 放完之后：圈里所有实际够到、带树果的人各吃一颗（敌友都算），茶席只留一段余韵，交回共享顺序。
 * 配置：grand 在参数层换「盛宴」与「便茶」；ai.minHolders / ai.stripFoes 是出手门槛。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_teatime/berry", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        return PokemonSkills.teatimeHoldsBerry(access, actor);
    });

    function teatimeHolds(context: WorldBehavior.Context, target: Entity): boolean {
        return !!CompanionBehavior.fact<boolean>(context, "world_combat:move_teatime/berry", target);
    }
    /** 茶席中心能否不被方块挡住地直达某点；与 execute 逐人消费用的是同一条真实遮挡判定。 */
    function teatimeReaches(access: CombatWorld, centre: number[], point: number[]): boolean {
        return access.clear(WorldCombat.point(centre[0], centre[1], centre[2]), WorldCombat.point(point[0], point[1], point[2]));
    }
    function teatimeCounts(context: WorldBehavior.Context, centre: number[], radius: number): { holders: number; friends: number; foes: number; ripe: number } {
        const self = source(context), access = world(context), selfActor = access.actor(self.ref);
        let holders = 0, friends = 0, foes = 0, ripe = 0;
        if (selfActor && PokemonSkills.teatimeHoldsBerry(access, selfActor) && distance(self.point, centre) <= radius
            && teatimeReaches(access, centre, self.point)) { holders++; friends++; }
        const nearby = (context.facts.nearby || []) as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, centre) > radius) continue;
            if (!teatimeHolds(context, other)) continue;
            if (!teatimeReaches(access, centre, other.point)) continue;
            holders++;
            if (other.friendly) friends++;
            else {
                foes++;
                if (other.maximum > 0 && other.health >= other.maximum - 0.01) ripe++;
            }
        }
        return { holders: holders, friends: friends, foes: foes, ripe: ripe };
    }

    const teatimeHolders = PokemonSkills.number("ai.minHolders", "开席门槛", 1, 5, 1);
    teatimeHolders.help = "茶席圈里至少这么多个带树果的人才值得开席；调到 1 有一颗就摆，调高则等更多人一起把果子吃掉。";
    const teatimeChase = PokemonSkills.number("ai.maxChase", "摆席距离", 3, 20, 1);
    teatimeChase.help = "威胁进入这个距离内才考虑摆茶；调小只在贴身时摆，调大愿意提前围过去。";
    const teatimeStrip = PokemonSkills.flag("ai.stripFoes", "只掀满血敌人的果子");
    teatimeStrip.help = "开启：只在圈里有满血的带果敌人时才摆，趁它满血掀掉保命/反击的果子最划算；关闭：只要圈里带果子的人够多就摆，也用来触发队友的果子。";

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
            // 掀对手果子只在满血时真的划算；否则看圈内友方能立刻吃到的收益。
            if (ai<boolean>(item, "stripFoes", true)) return counts.friends > 0 || counts.ripe > 0;
            return counts.holders > 0;
        },
        accepts: function (_context, _item, target) { return target.health > 0; },
        priority: function (context, item, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = source(context), access = world(context), actor = access.actor(self.ref);
            const radius = actor ? PokemonSkills.teatimeRadius(access, actor) : 4.0;
            const counts = teatimeCounts(context, threat.point, radius);
            const friendly = counts.friends * 30, strip = counts.ripe * 50;
            if (friendly + strip <= 0) return 0;
            return Math.min(90, 30 + friendly + strip);
        }
    });
}
