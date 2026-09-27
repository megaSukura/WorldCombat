/**
 * 愤怒粉 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有看得见的威胁、自己不是骑乘状态、身边 ai.watch 内有至少一个活着的同伴
 *   （原生的 onTry 同样要求这边不止一只），并且自己身上还没有这团粉。
 * 对谁出手：自己施放，落点选在威胁与自己之间、不超过真实撒粉距离的一小段近地（用来截住追兵，而不是只罩自己脚下）。
 * 什么时候最急：同伴生命低于 ai.allyBelow、而自己还在 ai.healthFloor 以上——能替它拦住追兵就先撒（priority 100）；
 *   否则 40，在共享的「掩护」次序里把通道封住。只有确有可受粉末的敌人会踏进这团云（草属性与玩家除外）才开 cover；
 *   否则把这声掩护让给别的行动。真实的技能就绪（PP、冷却与可达落点）由共享顺序与本招的 ready 一起保证。
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

    // 可被粉末牵动的目标：非友方、活着、非玩家，且不免疫粉末（草属性）。复用本单元导出的免疫判定。
    registerFact("world_combat:ragepowder/powderable", function (access, actor) {
        return !PokemonSkills.ragePowderImmune(access, actor);
    });

    function ragePowderNumber(context: WorldBehavior.Context, key: string, fallback: number, min: number, max: number): number {
        try { return Math.max(min, Math.min(max, PokemonSkills.p("ragepowder", key, world(context)))); } catch (error) { return fallback; }
    }

    /** 落点选在威胁与自己之间、不超过真实撒粉距离的一小段：用来截住追兵，而不是只罩自己脚下。 */
    function ragePowderLanding(context: WorldBehavior.Context, threat: Entity): number[] {
        const self = source(context), reach = ragePowderNumber(context, "reach", 4, 2, 9);
        const dx = threat.point[0] - self.point[0], dy = threat.point[1] - self.point[1], dz = threat.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, step = Math.min(reach, length);
        return [self.point[0] + dx / length * step, self.point[1] + dy / length * step, self.point[2] + dz / length * step];
    }

    /** 只有确实有可受粉末的敌人会踏进这团云，撒粉才有意义；否则交给别的掩护行动。 */
    function ragePowderLurees(context: WorldBehavior.Context, threat: Entity): number {
        const landing = ragePowderLanding(context, threat), radius = ragePowderNumber(context, "cloudRadius", 4, 2, 10);
        const nearby = context.facts.nearby as Entity[];
        let found = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === source(context).ref || other.friendly || other.player || !(other.health > 0) || !other.visible) continue;
            const dx = other.point[0] - landing[0], dz = other.point[2] - landing[2];
            if (dx * dx + dz * dz > radius * radius) continue;
            if (!fact<boolean>(context, "world_combat:ragepowder/powderable", other)) continue;
            found++;
        }
        return found;
    }

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
        ready: function (context) {
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (status(context, source(context), "ragepowder") || !threat) return false;
            // 真实就绪：半径/撒粉距离能算出来，且确有可受粉末的目标会踏进这团云。
            return ragePowderLurees(context, threat) > 0;
        },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat) return false;
            if (status(context, source(context), "ragepowder")) return false;
            if (ratio(source(context)) < ai<number>(item, "healthFloor", 0.35)) return false;
            if (ragePowderCrowd(context, ai<number>(item, "watch", 8)).length <= 0) return false;
            return ragePowderLurees(context, threat) > 0;
        },
        accepts: function (context, _item, target) { return target.ref === source(context).ref; },
        // 落点由本招自己选：威胁与自己之间那一小段可达的近地，而不是只罩脚下。
        target: function (context, _item, target) {
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat) return target;
            const copy: Entity = JSON.parse(JSON.stringify(target));
            copy.ref = source(context).ref;
            copy.point = ragePowderLanding(context, threat);
            return copy;
        },
        priority: function (context, item) {
            const self = source(context);
            if (status(context, self, "ragepowder")) return 0;
            const crowd = ragePowderCrowd(context, ai<number>(item, "watch", 8));
            if (!crowd.length) return 0;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || ragePowderLurees(context, threat) <= 0) return 0;
            const below = ai<number>(item, "allyBelow", 0.5);
            for (let index = 0; index < crowd.length; index++) if (ratio(crowd[index]) < below) return 100;
            return 40;
        }
    });
}
