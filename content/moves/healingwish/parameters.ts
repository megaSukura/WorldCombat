/**
 * 治愈之愿 / Healing Wish —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic、变化、威力 0、命中必中、PP 10、优先度 0、target self；
 *   selfdestruct: "ifHit"——自己倒下，并在自己这一侧留下 slotCondition：下一个换上来的宝可梦若受伤或有异常，
 *   则回满 HP 并 clearStatus，随即消耗。
 *
 * 世界化：把「自己倒下、把健康留给下一个上场的人」翻成即时战斗里的一次**牺牲**——施法者当场交出全部生命，
 *   在倒下的地方留下一颗治愈之愿；愿望会等一段时间，第一个来到它身边、又伤又病的伙伴（受伤或带有害状态效果）
 *   被整口治好（按其最大生命回复并洗掉全部有害状态效果），愿望随即散去。它是本家族里唯一**以命换命**的一招：
 *   不是净化别人，而是把自己变成一次救援。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   wishHeal    回复比例：特攻与等级决定愿力多足；广愿档 ×0.7、专愿档满额。
 *   wishReach   愿望的作用半径：体型高度与等级决定；广愿档 ×1.4。
 *   wishWait    愿望等多久：特防与等级决定；广愿档更短、专愿档更久。
 *   motes       愿光粒子量：特防与体型决定。
 *   tempo       起手：速度决定（越快越早把命交出去）。
 *   aftercast   收招：固定短促（自己已倒下）。
 *   recharge    冷却：等级提高熟练度。
 * 配置 broadcast（广愿／专愿）双向取舍：广愿半径 ×1.4、等待更短，但回复只有 ×0.7（罩得广、治得浅）；
 *   专愿半径 ×0.85、等待更久，但回复满额（贴得近、治好一个人）。
 */
namespace PokemonSkills {
    export const healingwishId = "healingwish";
    export const healingwishScene = "world_combat:move_healingwish";
    export const healingwishWishBrain = "world_combat:move/healingwish/wish";
    export const healingwishOfferText = "world_combat.move.healingwish.text.offer";
    export const healingwishDeliverText = "world_combat.move.healingwish.text.deliver";
    export const healingwishWasteText = "world_combat.move.healingwish.text.waste";
    /** 表现里的参考半径：`data.scale = 实际愿望半径 / 这个数`。 */
    export const healingwishReferenceRadius = 3.0;
    const healingwishBroadcast = { key: "worldcombat.skill." + healingwishId + ".preference.broadcast" };

    actionParameters.define(healingwishId, {
        wishHeal: percent(
            F.base(0.85)
                .plus(F.stat("specialAttack").minus(50).times(0.001).clamp(0, 0.15).as("特攻修正"))
                .times(F.when(F.pref("broadcast", healingwishBroadcast), F.const(0.7), F.const(1)).as("广愿"))
                .clamp(0.55, 1.0).round(3),
            "回复比例", "受益伙伴按其最大生命回复的比例；特攻越高愿力越足，广愿档 ×0.7、专愿档满额。"),
        wishReach: formula(
            F.base(3.0)
                .plus(F.body("height").minus(1.2).times(0.4).clamp(-0.4, 0.9).as("体型修正"))
                .plus(F.level().minus(20).max(0).times(0.05).clamp(0, 1.0).as("等级修正"))
                .times(F.when(F.pref("broadcast", healingwishBroadcast), F.const(1.4), F.const(0.85)).as("广愿"))
                .clamp(2, 7).round(2),
            "愿望半径", { unit: " 格", description: "愿望能照顾到多大一圈；体型越大、等级越高越大，广愿档 ×1.4。范围即判定，站在圈外不会被治好。" }),
        wishWait: seconds(
            F.base(200).plus(F.stat("specialDefence").times(0.5)).plus(F.level().minus(30).max(0).times(2).clamp(0, 60).as("等级修正"))
                .times(F.when(F.pref("broadcast", healingwishBroadcast), F.const(0.85), F.const(1.2)).as("广愿"))
                .clamp(120, 400).round(0),
            "愿望停留", "愿望在原地等多久；特防与等级越高等得越久，广愿档更短、专愿档更久。到点无人需要就自行散去。"),
        motes: formula(
            F.base(20).plus(F.stat("specialDefence").times(0.06)).plus(F.body("height").times(2)).clamp(14, 48).round(0),
            "愿光", { unit: " 点", description: "落下与治好时迸出的愿光点数量；特防与体型越大越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 3).as("速度修正")).clamp(8, 20).round(0),
            "起手", "动身之前的准备；速度越快越早把命交出去。准备期间不能移动，可被打断（此时不会倒下）。"),
        aftercast: seconds(F.base(6).clamp(4, 10).round(0), "收招", "交出生命之后的收势；自己已倒下，收招很短。"),
        recharge: seconds(
            F.base(320).minus(F.level().times(1.0)).clamp(200, 400).round(0),
            "冷却", "两次许愿之间的等待；等级越高越熟练。")
    });

    stages(healingwishId, [
        { level: 50, values: { recharge: 300 } },
        { level: 70, values: { recharge: 260 } }
    ]);

    describe(healingwishId, [
        { key: "description.0", values: ["wishHeal", "wishReach"] },
        { key: "description.1", values: ["wishWait"] },
        { key: "stance.broadcast", values: [], when: function (context) { return read(context.detail.values, ["broadcast"]) === true; } },
        { key: "stance.focus", values: [], when: function (context) { return read(context.detail.values, ["broadcast"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
