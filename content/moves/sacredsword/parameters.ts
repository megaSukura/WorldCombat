/**
 * 圣剑 / sacredsword —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：格斗、物理、威力 90、命中 100、PP 15、优先度 0、接触、切割（slice）
 *   （10 位学习者）。描述「用长角切斩对手进行攻击。无视对手的能力变化，直接给予伤害。」——
 *   即这一击按目标处于中性能力等级结算。
 *
 * 翻译：把「用长角切斩」落成**一记从身侧拉满、朝前送出最长的干净切斩**——角刃压着一条极长的直线划过，
 *   对手用涨起来的防御去迎，也只会被这一刀顺着刃口削开。它是本族射程最长、单发最重的一记：
 *   慢慢蓄、一步压上，只切一个人，切得又深又远。
 *
 * 与同族分开：逐步击破是贴脸连击、ＤＤ金勾臂是原地一整圈、惩罚从对手取力；圣剑凭「最长的一记正前切斩」。
 *
 * 「无视能力变化」的落点：`skill.ts` 末尾注册的 `PokemonDamage.metadata` 贡献点，在结算前把目标本段
 *   对应的防御能力等级归零；攻击方自身等级、相性、暴击、护甲与特性道具仍照常结算。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   cut        切斩威力：物攻定刃力、等级给手法；居合式再压一点。
 *   reach      刃程：身高给角长与跨步、速度给前探，也是实际射程（全族最长）；居合式再添一段。
 *   edge       判定半宽：体宽决定刃身多宽。
 *   depth      覆盖高度：身高决定这一刀划过的高度带。
 *   lunge      压上步：速度给冲量；居合式把身位整个送出去。
 *   gleam      刃光量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏、等级让冷却回得更快；居合式更慢更费。
 *
 * 配置 `iaido`（居合式，默认关）双向取舍：开启＝压上步 ×1.6、刃程 +0.3、每刀 ×1.06，代价是起手 +3 刻、
 *   收招 +1 刻、冷却 +5 刻——拉得最远、切得最狠；关闭（站斩式）＝原地出刀，刃程与威力略低，但节奏更快。
 *   两向各有局面：对远一点的单个目标用居合，对贴身目标用站斩更划算。
 *
 * 伤害段 `cut` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算，防御能力等级被本招忽略。
 */
namespace PokemonSkills {
    export const sacredswordId = "sacredsword";
    const sacredswordMoveText = "worldcombat.skill.sacredsword.preference.iaido";

    /** 宝可梦读原生能力等级，其他生物读共享能力等级；同一副 -6..+6 阶梯。 */
    function sacredswordStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (!world.valid(actor)) return {};
        return NativeEffects.effectiveStages(world, actor);
    }

    /** 目标身上防御向能力里正面等级的总和（防与特防）；0 表示此刻没有可被本招无视的涨防。 */
    export function sacredswordGuard(world: CombatWorld, actor: CombatActor): number {
        const stages = sacredswordStages(world, actor);
        let total = 0;
        ["def", "spd"].forEach(function (stat) { const value = stages[stat] || 0; if (value > 0) total += value; });
        return total;
    }

    actionParameters.define(sacredswordId, {
        /** 切斩威力：86 + 物攻偏移[−16,40] ×0.5 + 等级偏移[−6,16] ×0.3；居合 ×1.06；夹 62..170。 */
        cut: formula(
            F.base(86).plus(F.stat("attack").minus(65).times(0.5).clamp(-16, 40))
                .plus(F.level().minus(30).times(0.3).clamp(-6, 16))
                .times(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(1.06), F.const(1)))
                .clamp(62, 170).round(1),
            "切斩威力", {
                unit: "威力",
                description: "长角切过目标那一下的基础威力；物攻定刃力、等级给手法，居合式再压一点。对手防御、相性与暴击在命中时另算，**目标本段的防御能力等级被这一招忽略**。"
            }),
        /** 刃程：3.2 + 身高偏移[−0.3,1.1] ×0.55 + 速度偏移[−0.15,0.35] ×0.004 + 居合 0.3；夹 2.7..4.4。 */
        reach: formula(
            F.base(3.2).plus(F.body("height").minus(1.4).times(0.55).clamp(-0.3, 1.1))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35))
                .plus(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(0.3), F.const(0)))
                .clamp(2.7, 4.4).round(2),
            "刃程", {
                unit: "格",
                description: "长角能够到多远，也是本招的实际射程来源；身高给角长与跨步、速度给前探，居合式再添一段。它是本族最长的一记。"
            }),
        /** 判定半宽：0.3 + 体宽偏移[−0.03,0.13] ×0.1；夹 0.24..0.5。 */
        edge: formula(
            F.base(0.3).plus(F.body("width").minus(0.9).times(0.1).clamp(-0.03, 0.13)).clamp(0.24, 0.5).round(2),
            "判定半宽", {
                unit: "格",
                description: "这一刀划过多宽；身板越宽角刃越厚。画面里那道切痕的宽窄与它一致。"
            }),
        /** 覆盖高度：2.0 + 身高偏移[−0.15,0.7] ×0.3；夹 1.7..2.8。 */
        depth: formula(
            F.base(2.0).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.15, 0.7)).clamp(1.7, 2.8).round(2),
            "覆盖高度", {
                unit: "格",
                description: "这一刀划过的高度带；高大的个体切得更高。"
            }),
        /** 压上步：0.5 + 速度偏移[−0.1,0.4] ×0.005；居合 ×1.6；夹 0.2..1.4。 */
        lunge: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.1, 0.4))
                .times(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(1.6), F.const(1)))
                .clamp(0.2, 1.4).round(2),
            "压上步", {
                unit: "格",
                description: "出刀前朝目标压上的距离；速度给冲量，居合式把身位整个送出去。只压到判定边缘，不会穿过目标。"
            }),
        /** 刃光量：14 + 物攻偏移[−2,8] ×0.12；夹 10..32。 */
        gleam: formula(
            F.base(14).plus(F.stat("attack").minus(65).times(0.12).clamp(-2, 8)).clamp(10, 32).round(0),
            "刃光量", {
                unit: "道",
                description: "刃口划过时亮起的光痕数量，由物攻换算；粒子按它发射，画面里的道数与机制一致。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2.5] ×0.03 + 居合 +3；夹 5..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "把角刃拉到身侧、对准目标的时间；速度越快越短，居合式要多蓄一拍。"),
        /** 收招：7 − 速度偏移[−1,2] ×0.02 + 居合 +1；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(1), F.const(0)))
                .clamp(4, 12).round(0),
            "收招", "收刀、重新站稳的时间；速度越快越短，居合式多收一拍。"),
        /** 冷却：24 − 等级偏移[0,5] ×0.14 + 居合 +5；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(30).times(0.14).clamp(0, 5))
                .plus(F.when(F.pref("iaido", text(sacredswordMoveText)), F.const(5), F.const(0)))
                .clamp(16, 38).round(0),
            "冷却", "两次切斩之间等多久；等级越高回得越快，居合式更费。")
    });

    stages(sacredswordId, [
        { level: 38, values: { cut: 96 } },
        { level: 54, values: { cut: 106, reach: 3.6 } }
    ]);

    defineDamage(sacredswordId, "cut", {}, { contact: true, slice: true });

    describe(sacredswordId, [
        { key: "description.0", values: ["cut", "reach"] },
        { key: "description.1", values: ["lunge"] },
        { key: "iaido.on", values: ["reach", "lunge", "cut"], when: function (context) { return read(context.detail.values, ["iaido"]) === true; } },
        { key: "iaido.off", values: ["reach", "lunge", "cut"], when: function (context) { return read(context.detail.values, ["iaido"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cut", "tier.1.reach"] }
    ]);
}
