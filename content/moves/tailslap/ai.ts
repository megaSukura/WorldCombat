/**
 * 扫尾拍打 / tailslap —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带扫尾的伙伴把它当**原地整圈扫击**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 7）以内就出手；更远交给共享接近逻辑。
 * 收益怎么估：不再数「目标周围 3.5 格里有几个人」，而是数**自己这一次真实扫区**里的人——
 *   旋扫式按本个体公式算出的 `radius` 整圈，砸尾式按同一公式收窄后的前向扇面（都读 `PokemonSkills.p`，
 *   与判定、指示圈同源）。扫区内还站着别的敌人时才更愿意起旋。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。
 * 够不到怎么办：范围交给上面的真实半径，共享任务负责把身位送进作用范围。
 * 放完之后：整趟转完（或目标先倒）就收势，交回共享交战计划等冷却。
 * 优先级：基础 16；已在真实扫过半径内 +6；`ai.crowd` 开启且自己扫区内 ≥1 个别的敌人 +10。仅剩本招可选时，
 *   它仍在普通顺序里被选中。驻守是否允许离位由共享任务读 `ai.leaveStation`（默认开）。
 */
namespace CompanionBehavior {
    /** 本个体这一招的真实扫过半径（身高、身宽决定）；AI 收益估计与判定、指示圈同源。 */
    function tailslapReach(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(2.2, PokemonSkills.p(PokemonSkills.tailslapId, "radius",
                { world: world, actor: world.source(), skill: PokemonSkills.skills.tailslap, detail: { values: item.data.config || {} } }));
        } catch (error) {
            return typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : 3.0;
        }
    }

    /** 本个体这一次的真实扫过张角：旋扫 360，砸尾按公式收成前向一段。 */
    function tailslapArc(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(90, Math.min(360, PokemonSkills.p(PokemonSkills.tailslapId, "arc",
                { world: world, actor: world.source(), skill: PokemonSkills.skills.tailslap, detail: { values: item.data.config || {} } })));
        } catch (error) {
            return 360;
        }
    }

    function tailslapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 7);
    }

    /**
     * 自己真实扫区内的敌人数：旋扫按整圈、砸尾按朝目标的前向扇面，用与判定同一个 `WorldGeometry.sector`。
     * 扫区内还站着别的敌人（目标之外）时，整圈/整段能一次照顾到，才值得起旋。
     */
    function tailslapCrowd(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = CompanionBehavior.source(context);
        const radius = tailslapReach(context, item);
        const arc = tailslapArc(context, item);
        const origin = CompanionBehavior.point(self.point);
        const heading = CompanionBehavior.point(target.point).minus(origin);
        const sweep = WorldGeometry.sector(origin, heading, radius, arc, { below: 1.5, above: 3.0 });
        let count = 0;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (sweep.contains(CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    registerUse("tailslap", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return tailslapReach(context, item); },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return tailslapWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !tailslapWants(context, item, target)) return 0;
            const radius = tailslapReach(context, item);
            const range = CompanionBehavior.distance(source(context).point, target.point);
            let score = 16;
            if (range <= radius) score += 6;
            if (ai<boolean>(item, "crowd", true) && tailslapCrowd(context, item, target) >= 1) score += 10;
            return score;
        }
    });

    PokemonSkills.addPreferences("tailslap", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("smash"), "砸尾式", "boolean", {
            help: "开启（砸尾）：每圈威力 ×1.25、上挑 ×1.4，把伤害集中并挑起来；代价是只扫前向约 200° 一段（张角 ×0.55）、推开 ×0.8、间隔 +1 刻。关闭（旋扫，原生式）：整圈 360°、推开更足，一次照顾四周所有人；代价是每圈略轻。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动起旋，先走近。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.crowd"), "瞄准扎堆", "boolean", {
            help: "开启：自己的真实扫区（旋扫整圈／砸尾前向扇面）里还站着别的敌人时更愿意起旋，因为一次能照顾到好几个；关闭则只按普通近身攻击排序。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为扫尾离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
