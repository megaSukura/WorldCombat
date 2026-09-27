/**
 * 光合作用 的伙伴 AI：这是依赖光照的持续自我回复，所以它除了看血量，还看头顶那片光。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时才排进恢复计划。
 * 光照条件：所在点的日照低于 ai.minimumLight（默认 0.2）时通常不浪费这一轮——树荫、夜里、室内都先不动用；
 *   但生命已跌到回复阈值的一半以下（危急）时不再苛求亮处，先摊叶接住保底的一截。
 * 安全站定窗口：整段光合要求原地站定，出手前先看有没有贴身的可见敌人或正被攻击；有不安全就等更稳的时机，
 *   危急时仍先摊叶保命。日照估值与执行期每刻读的 WorldEnvironment.sunlight 是同一个读数函数（同一来源）。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 * 放完之后：四口小回复随光合期逐口到账；这招冷却较长，不重复施放。
 */
namespace CompanionBehavior {
    const synthesisBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    synthesisBelow.help = "自身生命低于该比例时才把光合作用排进恢复计划；调低更倾向硬撑，调高则一掉血就摊叶。";
    const synthesisLight = PokemonSkills.number("ai.minimumLight", "最低日照", 0, 1, 0.05);
    synthesisLight.help = "所在点日照低于该值就不施放，等走到更亮的地方；调低会在树荫里也回一口，调高只在正午的强光下才动用。生命跌到回复阈值一半以下时会无视此值先求保命。";

    PokemonSkills.addPreferences("synthesis", { ai: { healBelow: 0.7, minimumLight: 0.2 } }, [synthesisBelow, synthesisLight]);

    /** 站定安全窗口：贴在身边的可见敌人或正在攻击自己的敌人会打断光合，出手前避开。 */
    function synthesisThreatened(context: WorldBehavior.Context, self: Entity): boolean {
        var nearby = context.facts.nearby as Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === String(context.actor)) continue;
            if (other.attacking === self.ref) return true;
            if (distance(other.point, self.point) <= 3) return true;
        }
        return false;
    }

    registerUse("synthesis", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(source(context));
            if (health >= below) return false;
            var critical = health < below * 0.5;
            // 先评安全站定窗口：不安全就不浪费这段站定，危急时例外。
            if (!critical && synthesisThreatened(context, source(context))) return false;
            var light = context.facts.sunlight;
            if (typeof light !== "number") return true;
            if (light >= ai<number>(item, "minimumLight", 0.2)) return true;
            // 急危时为保命接受低光保底，不再等最亮点、也不为绕路找光而错过窗口。
            return critical;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
