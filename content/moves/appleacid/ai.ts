/**
 * 苹果酸 / appleacid —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且落在 `ai.maxChase`（默认 13）格内；这是中远程的一发投掷。
 * 对谁出手：`ai.stackSour`（默认开）打开时，优先对已经带着发酵身份的目标再补一颗——那一发更狠（−2）；
 *   没有发酵目标时按普通远程排序。关闭则只看射程与普通顺序。
 * 够不到怎么办：交给共享接近逻辑走近到 `reach` 内再扔；`approachTarget` 让伙伴朝目标靠近。
 * 放完接什么：交回共享交战计划；落点酸浆会继续咬人，若目标还带发酵，伙伴可优先补第二颗。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("appleacid", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "stackSour", true)) return base;
            return CompanionBehavior.status(context, target, "sour") ? base + 12 : base;
        }
    });

    addPreferences("appleacid", {}, [
        field(pathOf("ferment"), "发酵式", "boolean", {
            help: "开启：苹果飞得更慢、砸击与溅射略轻、溅射范围更小，但发酵时长 ×1.6、酸浆更久，更容易对同一目标叠到 −2。关闭（爆汁式）：一发砸得更痛、溅得更开、飞得更快，但酸留不久。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不扔苹果，先走近；越大越愿意从远处先手。"
        }),
        field(pathOf("ai.stackSour"), "叠酸优先", "boolean", {
            help: "开启：优先对已带发酵身份的目标再补一颗酸苹果（第二口更狠，−2）；关闭：当普通远程攻击排序。"
        })
    ]);
}
