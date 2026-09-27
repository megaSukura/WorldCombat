/**
 * 晨光 的伙伴 AI：它是一口靠天吃饭的回复，所以 AI 会看头顶有没有晨光，并在有时间时主动走到光下。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时排进恢复计划。
 * 等天：ai.waitForSky（默认开）打开时只在「晨光可及」时出手——执行、说明与 AI 共用同一个
 *   morningsunDawnAt 真事实（白天 × 可见天空 × 无雨，或共享语义的烈日），所以人工烈日也被正确识别，
 *   漆黑的洞穴不会被误读成晨光。
 * 走向光下：当前不在光里时，先就近找一圈有真实支撑、视线可达、且当前晨光可及的落脚点并走过去；到了那里
 *   再取强晨光。找不到可达光斑才继续原地等天气，不把「等」当成唯一手段。
 * 危急：等待中若生命已跌到回复阈值一半以下，先取保底回复，不为等最强晨光而错过窗口。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 */
namespace CompanionBehavior {
    const morningsunBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    morningsunBelow.help = "自身生命低于该比例时才把晨光排进恢复计划；调低更倾向硬撑，调高则一掉血就迎候晨光。";
    const morningsunSky = PokemonSkills.flag("ai.waitForSky", "等晨光");
    morningsunSky.help = "开启：只在晨光可及（白天晴空或共享烈日）时出手，不在光里时先走向附近可达的露天光斑；实在找不到才留在原地等（夜里与阴雨回复少、也没有加速）。关闭：受伤就照用，接受保底回复。";

    PokemonSkills.addPreferences("morningsun", { ai: { healBelow: 0.7, waitForSky: true } }, [morningsunBelow, morningsunSky]);

    /** 就近的可见晨光落脚点：真实支撑、从自身可直达、当前 morningsunDawnAt 为真；没有则 null。 */
    function morningsunSunlitSpot(context: WorldBehavior.Context): number[] | null {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const here = CompanionBehavior.point(self.point);
        if (PokemonSkills.morningsunDawnAt(world, here)) return null;
        const radii = [3, 6, 9], spokes = 8;
        for (let r = 0; r < radii.length; r++) {
            const radius = radii[r];
            for (let i = 0; i < spokes; i++) {
                const angle = i * Math.PI * 2 / spokes;
                const candidate = [self.point[0] + Math.cos(angle) * radius, self.point[1], self.point[2] + Math.sin(angle) * radius];
                const at = CompanionBehavior.point(candidate);
                if (!PokemonSkills.morningsunDawnAt(world, at)) continue;
                if (!world.clear(here, at)) continue;
                const below = world.block(CompanionBehavior.point([candidate[0], candidate[1] - 1, candidate[2]]));
                const id = below === null ? "" : String(below.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
                    || id === "minecraft:water" || id === "minecraft:lava") continue;
                return candidate;
            }
        }
        return null;
    }

    registerUse("morningsun", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(source(context));
            if (health >= below) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            var world = CompanionBehavior.world(context);
            if (PokemonSkills.morningsunDawnAt(world, point(source(context).point))) return true;
            // 危急时接受低光保底，避免为等最强晨光而耽误自救。
            if (health < below * 0.5) return true;
            // 还有时间：先走向附近可见的天空，到了再取强晨光。
            return morningsunSunlitSpot(context) !== null;
        },
        approach: function (context) {
            var world = CompanionBehavior.world(context);
            if (PokemonSkills.morningsunDawnAt(world, point(source(context).point))) return null;
            return morningsunSunlitSpot(context);
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
