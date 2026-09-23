/**
 * 背水一战 / noretreat —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：格斗、变化、威力 0、命中 必中、PP 5、优先度 0、目标 自身；
 *   `boosts: {atk:1, def:1, spa:1, spd:1, spe:1}` 五项各 +1；同时挂 volatile `noretreat`，
 *   `onTrapPokemon` 让自己无法逃走／换人；已经带着这个 volatile 时整招失败。
 *   原生介绍「提高自己的所有能力，但无法替换或逃走。」
 *
 * 世界化：把「提高全部能力、但退无可退」落成**一声怒吼顶起全身五道力，同时把脚钉进地里**。
 *   它是本族唯一**自己给自己上锁**的一招：代价明明白白——在这段时间里你挪不动半步，只能站定打。
 *   放它的时机是「我还站得住、且已经贴上了必须解决的目标」；低血时把自己钉在别人刀下并不划算。
 *
 * 与同族分开：扎根拿移动换续血、黑色目光靠凝视维持；背水一战拿移动换一次全项强化，锁更短、油门更猛。
 *
 * 数值来源（每项读不同的个体数据，落到不同参数）：
 *   standTicks  立誓时长：等级与防御决定能站多久；疾战式只站一半时间。
 *   surge       力量迸发量：物攻换算，驱动画面里向上喷起的力场粒子数量。
 *   ring        脚下阵环半径：体重换算，表现里那圈地纹的参考半径。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏；疾战式冷却更短。
 *
 * 配置 `rush`（疾战）双向取舍（默认关）：
 *   开（疾战）：只顶起攻击、特攻、速度三项，立誓时长减半、冷却 ×0.75——出手快、脱身快，但放弃双防。
 *   关（背水）：五项全 +1，站得更久、冷却更长——全面强化，但把自己钉得更久。
 *
 * 说明：五项强化走 NativeEffects.boost（不忽略特性），因此「唱反调」一类特性会自然参与。
 */
namespace PokemonSkills {
    export const noRetreatId = "noretreat";
    export const noRetreatScene = "world_combat:move_noretreat";
    export const noRetreatEffect = "world_combat:no_retreat";
    export const noRetreatStand = "world_combat:noretreat_stand";
    export const noRetreatRootText = "world_combat.move.noretreat.text.root";
    export const noRetreatReleaseText = "world_combat.move.noretreat.text.release";

    actionParameters.define(noRetreatId, {
        standTicks: seconds(
            F.base(200).plus(F.level().times(2).as("经验")).plus(F.stat("defence").times(0.6).as("防御"))
                .times(F.when(F.pref("rush", text("worldcombat.skill.noretreat.preference.rush")), F.const(0.5), F.const(1)))
                .clamp(160, 440).round(0),
            "立誓时长", "把自己钉在原地多久；等级与防御越高站得越久，疾战式只站一半。时长走完或被打倒才拔脚。"),
        surge: formula(
            F.base(14).plus(F.stat("attack").times(0.15).as("物攻")).clamp(12, 34).round(0),
            "力量迸发", {
                unit: " 点", visible: false,
                description: "怒吼顶起那一下喷出的力场粒子量；物攻越高越多，也是画面的吞吐量。"
            }),
        ring: formula(
            F.base(1.2).plus(F.body("weight").div(70).as("体重")).clamp(1.0, 2.6).round(2),
            "阵环半径", {
                unit: " 格", visible: false,
                description: "脚下那圈地纹铺多大；体重越大铺得越开，是表现里阵环的参考半径。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).as("速度")).clamp(7, 16).round(0),
            "起手", "沉腰、怒吼、把力顶起来需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(6, 13).round(0),
            "收招", "怒吼之后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(160).minus(F.level().times(0.6).as("经验"))
                .times(F.when(F.pref("rush", text("worldcombat.skill.noretreat.preference.rush")), F.const(0.75), F.const(1)))
                .clamp(90, 220).round(0),
            "冷却", "两次立誓之间的等待；等级越高越熟练，疾战式更短。PP 5 的代价。")
    });

    stages(noRetreatId, [
        { level: 45, values: { standTicks: 300, recharge: 130 } }
    ]);

    describe(noRetreatId, [
        { key: "description.0", values: ["standTicks"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo","aftercast","recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["rush"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["rush"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.standTicks", "tier.0.recharge"] }
    ]);
}
