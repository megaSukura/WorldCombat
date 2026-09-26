/**
 * 糖浆炸弹 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，在 ai.maxChase 之内，而且身上还没有 syrupbomb 身份。
 *   默认 ai.cluster=1 表示看得见就丢；调大后只在目标身边挤着足够多敌人时才值得一次炸一片。
 * 对谁出手：当前威胁；若开浓糖（thick），爆散更大、更能罩住一簇。`ai.lead` 给移动中的目标一点提前量，
 *   把糖提前铺在它下一刻要经过的位置（这就是“狭口预放”的落点）。
 * 已有糖衣避免重复浪费：accepts 与 priority 都要求目标身上还没有 syrupbomb 身份。
 * 够不到怎么办：reach 就是投掷距离，超出先由共享接近逻辑走近。
 * 放完之后：满身糖连续掉速度，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("syrupbomb", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.number("ai.cluster", "起爆人数", 1, 4, 1),
        PokemonSkills.number("ai.lead", "预判提前量", 0, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function syrupbombCluster(context: WorldBehavior.Context, target: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function syrupbombWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (status(context, threat, "syrupbomb")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        const blast = item.data.config && item.data.config.thick ? 3.2 : 2.2;
        return syrupbombCluster(context, threat, blast) >= ai<number>(item, "cluster", 1);
    }

    registerUse("syrupbomb", {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || syrupbombWants(context, item, target); },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "syrupbomb");
        },
        /** 给移动中的目标一点提前量：把糖铺在它下一刻要经过的位置，而不是此刻站的地方。 */
        target: function (context, item, selected) {
            const lead = ai<number>(item, "lead", 0), velocity = selected.velocity;
            if (lead <= 0 || !velocity) return selected;
            const copy = JSON.parse(JSON.stringify(selected));
            copy.point = [selected.point[0] + velocity[0] * lead, selected.point[1], selected.point[2] + velocity[2] * lead];
            return copy;
        },
        priority: function (context, item, target) {
            if (!target || !syrupbombWants(context, item, target)) return 0;
            const blast = item.data.config && item.data.config.thick ? 3.2 : 2.2;
            return Math.min(95, 32 + syrupbombCluster(context, target, blast) * 12);
        }
    });
}
