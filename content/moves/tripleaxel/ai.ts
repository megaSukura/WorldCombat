/**
 * 三旋击 / tripleaxel 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 4）格以内；这是近身招，更远先走近。
 * 对谁出手：当前威胁；横扫式下身旁的目标也会一起被扫到，但排序仍以当前目标为准。
 * 前侧空间：滑步旋身沿本个体实际公式算出的固定弧走——用 `slide`／`spin` 推出第二、第三脚的**真实脚点**，
 *   逐个用原生空域探针检查；弧上任一落脚点放不下身体就降权，避免被墙夹住提前收势。
 * 多敌：扇弧内站了不止一个敌人时抬高优先级，一次旋踢的价值随人数上升。
 * 放完之后：三脚踢完交回共享交战计划；带着冷却时不会重复起旋。
 */
namespace PokemonSkills {
    /** 沿本招实际公式的侧弧模拟第二、第三脚落脚点，逐点查真实脚点空域；任一落脚点放不下就降权。按决策帧缓存一次。 */
    function tripleaxelRoom(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_tripleaxel/room/" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            if (typeof (world as any).freeSpace !== "function") return true;
            const self = CompanionBehavior.source(context);
            const actor = world.actor(self.ref);
            const body = actor === null ? null : world.observe(actor);
            if (body === null) return true;
            const at = body.position();
            const width = Math.max(0.4, body.width()), height = Math.max(0.6, body.height());
            let slide = 1.5, spin = 42;
            try {
                const values = { world: world, actor: world.source(), skill: PokemonSkills.skills[tripleaxelId],
                    detail: { values: capability.data.config || {} } };
                slide = Math.max(0.4, PokemonSkills.p(tripleaxelId, "slide", values));
                spin = PokemonSkills.p(tripleaxelId, "spin", values);
            } catch (error) { }
            const dx = target.point[0] - at.x(), dz = target.point[2] - at.z();
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.4) return true;
            let heading = WorldCombat.point(dx / length, 0, dz / length);
            let foot = WorldCombat.point(at.x(), at.y() - height * 0.5, at.z());
            // 与技能同一套侧弧：每一步先转 spin、再前移 slide；查的是真实脚点，不是左右任一空位。
            for (let leg = 0; leg < 2; leg++) {
                const angle = spin * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
                heading = WorldCombat.point(heading.x() * cos - heading.z() * sin, 0, heading.x() * sin + heading.z() * cos);
                foot = WorldCombat.point(foot.x() + heading.x() * slide, foot.y(), foot.z() + heading.z() * slide);
                if (!world.freeSpace(foot, width, height)) return false;
            }
            return true;
        });
    }
    /** 扇弧射程内站着的其他敌人数量：越多越值得一次横扫。 */
    function tripleaxelCrowd(context: WorldBehavior.Context, reach: number): number {
        const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
        const self = CompanionBehavior.source(context);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= reach + 1.4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(tripleaxelId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (tripleaxelCrowd(context, capability.data.range) >= 2) score += 14;
            if (!tripleaxelRoom(context, capability, target)) score -= 10;
            return Math.max(6, score);
        }
    });

    addPreferences(tripleaxelId, {}, [
        flag("widen", "横扫"),
        number("ai.maxChase", "出手距离", 2, 8, 1)
    ]);
}
