/**
 * 火之誓约 / firepledge 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、存活、非友方，且在 `ai.maxChase`（默认 12）格内。火柱指哪打哪，是一张中距离的
 *   常规输出；按实际 `comboDetect` 找到同阵营、尚未组合的草／水誓约印时，把落点挪到印上抬高 priority——共鸣的
 *   那一击更重，还会把参与印消费掉、当场扩成火海或彩虹。落点已经压着一片组合场时不再出火柱：一记火柱不叠第二层场。
 * 对谁出手：当前威胁；`accepts` 只排除友方、已死、看不见的（手动输入另有自己的限制，不受这里约束）。
 * 怎么够到：共享接近把身位收进射程（`kind: point`，以选中的落点为落点）。
 * 放完接什么：交回共享交战计划；短印与组合场留在原地按自己的寿命消散。
 * 排序：共鸣可用 54，彩虹有受伤友方受益再 +4；否则 34。上限 58，压过普通攻击但不抢紧急救援。
 */
namespace PokemonSkills {
    function firepledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    /** 落点已经压着一片组合场：不再无脑叠场。 */
    function firepledgeArenaAt(world: CombatWorld, point: CombatPoint, radius: number): boolean {
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (WorldCombat.point(areas[i].position[0], areas[i].position[1], areas[i].position[2]).minus(point).length() <= radius + areas[i].radius) return true;
        }
        return false;
    }

    interface FirePledgeChoice { point: number[]; score: number; }

    /** 按实际 detect、剩余时间与受益者选择落点：可共鸣就把柱子压到印上，彩虹优先照顾圈内受伤友方。 */
    function firepledgeChoice(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): FirePledgeChoice | null {
        const key = "firepledge:point:" + item.id + ":" + target.ref;
        if (Object.prototype.hasOwnProperty.call(context.scratch, key)) return context.scratch[key];
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context), caster = world.source();
        const scope = { world: world, actor: caster, detail: { values: item.data.config || {} } };
        const prepare = Math.max(5, Math.round(p(firepledgeId, "tempo", scope)));
        const detect = p(firepledgeId, "comboDetect", scope);
        const comboRadius = Math.max(1, p(firepledgeId, "markRadius", scope)) * p(firepledgeId, "comboScale", scope);
        const reach = item.data.range;
        const here = CompanionBehavior.point(target.point);
        const resonance = firepledgeResonance(world, caster, here, detect);
        const candidates: CombatPoint[] = [here];
        if (resonance) {
            const centre = WorldCombat.point(resonance.position[0], resonance.position[1], resonance.position[2]);
            if (centre.minus(here).length() > 0.2) candidates.push(centre);
        }
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let best: FirePledgeChoice | null = null;
        candidates.forEach(function (candidate) {
            if (CompanionBehavior.distance(self.point, [candidate.x(), candidate.y(), candidate.z()]) > reach) return;
            if (firepledgeArenaAt(world, candidate, comboRadius)) return;
            const match = firepledgeResonance(world, caster, candidate, detect);
            let score = match ? 54 : 34;
            if (match && firepledgeComboKind(match.rule) === "rainbow") {
                const centre = WorldCombat.point(match.position[0], match.position[1], match.position[2]);
                for (let i = 0; i < nearby.length; i++) {
                    const friend = nearby[i];
                    if (friend.health <= 0 || CompanionBehavior.ratio(friend) >= 0.9) continue;
                    if (friend.ref !== self.ref && !friend.friendly) continue;
                    if (CompanionBehavior.distance(friend.point, [centre.x(), centre.y(), centre.z()]) <= comboRadius) { score = 58; break; }
                }
            }
            if (!best || score > best.score) best = { point: [candidate.x(), candidate.y(), candidate.z()], score: score };
        });
        context.scratch[key] = best;
        return best;
    }

    CompanionBehavior.registerUse(firepledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firepledgeTarget(context, capability, target) && firepledgeChoice(context, capability, target) !== null;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, target) {
            const choice = firepledgeChoice(context, capability, target);
            if (!choice) return null;
            const selected: CompanionBehavior.Entity = JSON.parse(JSON.stringify(target));
            selected.ref = ""; selected.point = choice.point.slice();
            return selected;
        },
        priority: function (context, capability, target) {
            if (!target || !firepledgeTarget(context, capability, target)) return 0;
            const choice = firepledgeChoice(context, capability, target);
            return choice ? choice.score : 0;
        }
    });

    addPreferences(firepledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("fierce"), "烈誓", "boolean", {
            help: "开启（烈誓）：火柱威力 ×1.12、柱更粗、冷却 +12，但誓约印只留七成时间——烧得更狠、共鸣窗口更短。关闭（缓誓）：威力 ×0.96，誓约印 ×1.25、冷却更短——伤害低一点，留更久的共鸣窗口等另一誓约来呼应。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立火柱，超过就先走近。调小更贴身、调大愿意远程点火。"
        })
    ]);
}
