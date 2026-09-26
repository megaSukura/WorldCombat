/**
 * 丛林治疗 的伙伴 AI：这是以自己为心、一次包住一圈伙伴的综合救援（回血 + 洗状态）。
 *
 * 什么局面有意义：先数一圈——包括自己在内、生命低于 ai.healBelow（默认 0.82）的人有几个，
 *   带着有害状态效果的人有几个。有人带病就值得唤（洗状态是本招独有的价值）；只有受伤时，
 *   要凑够 ai.rescueCount（默认 2）人才愿意动用这场昂贵的群救，单人小伤不抢。
 * 对谁出手：共享的「伤者」感官挑出最需要的人作为接近对象；施放仍以自身为心，伙伴必须被罩进半径。
 * 够不到怎么办：approachTarget 指向伤者，由共享任务把身体带进 radius 内再放。
 * 站哪儿更值：脚下是自然地面时整招回得更多、圈更大，priority 因此更高。
 * 配置：deeproot 在参数层换「根深圈大」与「浅根快放」；ai.healBelow / ai.maxChase / ai.rescueCount
 *   是救助阈值、愿意跑多远与起用这场群救的最小受益人数。
 */
namespace CompanionBehavior {
    registerFact("world_combat:move_junglehealing/harmful", (world, actor) => CombatStatus.hasHarmful(world, actor));
    registerFact("world_combat:move_junglehealing/nature", (world, actor) => {
        const body = world.observe(actor);
        if (body === null) return false;
        const position = body.position();
        const feet = WorldCombat.point(position.x(), position.y() - body.height() / 2 - 0.2, position.z());
        const block = world.block(feet);
        return block !== null && PokemonSkills.junglehealingNaturalBlock(String(block.id()));
    });
    const junglehealingBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    junglehealingBelow.help = "自己或伙伴生命低于该比例才把丛林治疗算进救助计划；调低更倾向继续输出，调高一有人掉血就放。";
    const junglehealingChase = PokemonSkills.number("ai.maxChase", "施救距离", 3, 20, 1);
    junglehealingChase.help = "伙伴离自己这个距离以内才被算进这圈丛林；调小只在身边时救，调大愿意靠过去把更远的伙伴一起罩进来。";
    const junglehealingRescue = PokemonSkills.number("ai.rescueCount", "结伴救助人数", 1, 4, 1);
    junglehealingRescue.help = "没有有害状态、只有受伤时，至少这么多个伙伴（含自己）受伤才动用这场昂贵群救；调到 1 单人小伤也放，调高只留给真正的团救。";

    PokemonSkills.addPreferences("junglehealing", {}, [junglehealingBelow, junglehealingChase, junglehealingRescue]);

    function junglehealingAfflicted(context: WorldBehavior.Context, target: Entity): boolean {
        return fact<boolean>(context, "world_combat:move_junglehealing/harmful", target) === true;
    }

    /** 数一数这一圈里真正受益的人：受伤的、带病的、以及最低血量比例。 */
    function junglehealingBeneficiaries(context: WorldBehavior.Context, item: WorldBehavior.Capability): { wounded: number; afflicted: number; lowest: number } {
        const self = source(context);
        const below = ai<number>(item, "healBelow", 0.82);
        const reach = Math.max(1.5, Number(item.data.range) || 2.6) + 0.6;
        let wounded = 0, afflicted = 0, lowest = 1;
        const candidates: Entity[] = [self];
        (context.facts.nearby as Entity[]).forEach(function (other) {
            if (!other.friendly || other.health <= 0) return;
            if (String(other.ref) === String(self.ref)) return;
            if (distance(self.point, other.point) > reach) return;
            candidates.push(other);
        });
        candidates.forEach(function (other) {
            const value = ratio(other);
            if (value < below) wounded++;
            if (junglehealingAfflicted(context, other)) afflicted++;
            if (value < lowest) lowest = value;
        });
        return { wounded: wounded, afflicted: afflicted, lowest: lowest };
    }

    registerUse("junglehealing", {
        protocols: ["world_combat:heal"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            const found = junglehealingBeneficiaries(context, item);
            if (found.afflicted >= 1) return true;
            return found.wounded >= ai<number>(item, "rescueCount", 2);
        },
        accepts: function (_context, _item, target) { return target.friendly && target.health > 0; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            const found = junglehealingBeneficiaries(context, item);
            if (found.afflicted === 0 && found.wounded === 0) return 0;
            const severe = (target && ratio(target) < 0.35) || found.lowest < 0.35;
            let score = found.afflicted > 0 ? 70 + found.afflicted * 10 : 40 + found.wounded * 8;
            if (fact<boolean>(context, "world_combat:move_junglehealing/nature", source(context)) === true) score += 12;
            return severe ? Math.max(score, 100) : score;
        }
    });
}
