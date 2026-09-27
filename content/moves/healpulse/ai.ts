/**
 * 治愈波动 的伙伴 AI：这是一口会赶路的远距离救助，只送给别人、送给自己没有意义。
 *
 * 何时考虑：共享的「伤者」感官挑出一个生命低于 ai.healBelow（默认 0.75）的友方，且它在 ai.maxChase（默认 12）以内。
 * 对谁出手：那个受伤的伙伴；不接受自己、也不接受敌人——这是送给别人的波。
 * 候选之间怎么排：先看这一口能不能及时送到——用本个体实际的起手（charge）与运输时间（距离 ÷ pulseSpeed）估一个到达延时，
 *   越急（生命越低）越想救，同等紧急下波到得越快越先（近的、速度高的先于远的、超载慢的）；急危者整体抬到 100 一档。
 * 够不到怎么办：reach 就是本招射程，共享任务先走近再送；波在路上的真实推进与墙阻挡由本招机制承担。
 * 放完之后：伙伴拿到这一口，伙伴交回共享顺序继续战斗。
 * 配置：overcharge 切换超载／轻吐；ai.healBelow 与 ai.maxChase 调救助阈值与愿意跑多远送。
 */
namespace CompanionBehavior {
    const healpulseBelow = PokemonSkills.number("ai.healBelow", "救助阈值", 0.3, 0.95, 0.05);
    healpulseBelow.help = "伙伴生命低于该比例才把波动排进救助计划；调低更倾向继续输出，调高一有人掉血就去救。";
    const healpulseChase = PokemonSkills.number("ai.maxChase", "递波距离", 4, 24, 1);
    healpulseChase.help = "伙伴离自己这个距离以内才考虑递波；调小只在身边时救，调大愿意跨一段距离去送。";

    PokemonSkills.addPreferences("healpulse", { overcharge: false, helpFriends: true, ai: { healBelow: 0.75, maxChase: 12 } }, [healpulseBelow, healpulseChase]);

    /** 本次配置实际的波动速度与起手，与出招走的同一棵公式——用来估运输时间。 */
    function healpulseNumber(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string, fallback: number): number {
        const world = CompanionBehavior.world(context);
        try {
            return PokemonSkills.p(PokemonSkills.healpulseId, key,
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.healpulseId],
                    detail: { values: capability.data.config || {} } });
        } catch (error) { return fallback; }
    }

    registerUse("healpulse", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 12)) return false;
            return ratio(target) < ai<number>(capability, "healBelow", 0.75);
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            if (!target.friendly || String(target.ref) === String(self.ref) || target.health <= 0) return 0;
            const risk = ratio(target);
            if (risk >= ai<number>(capability, "healBelow", 0.75)) return 0;
            const speed = Math.max(0.2, healpulseNumber(context, capability, "pulseSpeed", 0.55));
            const delay = healpulseNumber(context, capability, "charge", 9) + distance(self.point, target.point) / speed;
            const base = risk < 0.4 ? 100 : 42;
            // 越晚到越靠后：同等伤情下，波到得快的伙伴先救，慢的（远、超载）排在其后。
            return Math.max(1, Math.round(base - delay * 0.25));
        }
    });
}
