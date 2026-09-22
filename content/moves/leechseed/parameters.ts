/**
 * 寄生种子 / leechseed —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Grass／变化／威力 0／命中 90／PP 10／目标 normal；
 *   `onTryImmunity` 草属性免疫；命中挂 volatile `leechseed`，每回合结算时抽走目标最大生命的 1/8 并回复施放者。
 *
 * 核心念头：把一粒种子种进对手身上，让它扎下根去，每隔一会儿从它身上抽一口回自己身上；
 *   根一旦扎下就一直连到对方倒下或被人清掉。种子打在草属性身上不生根。
 *
 * 翻译：原作的「每回合抽 1/8」翻成真实世界的一条钟——种子在目标身上每隔 `interval` 刻抽一次
 *   `drain` 比例的最大生命，按实际抽到的量回补施放者。种子是一条真正的 MobEffect（共享身份
 *   world_combat:status/leechseed，物品栏可见、/effect 可用、牛奶可解），旁边挂一枚机读标记带走
 *   施放者、间隔与抽量，供逐刻结算与画面读取。走完自己的时间或被外力解除通向同一幕收尾。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach      播种距离：等级与特攻共同决定能撒到多远，并作为本招实际射程。
 *   seedSpeed  种子速度：速度决定种子飞得多快。
 *   seedRadius 判定半径：碰撞箱高度决定种子的横向判定。
 *   seedTicks  种子存续：等级与特攻撑多久。
 *   interval   抽取间隔：速度决定相隔多久抽一口。
 *   drain      每口抽量：特攻决定每次抽走目标最大生命的比例。
 *   vines      藤蔓条数：特攻决定画面里连接两者的藤蔓与光点数量。
 * 配置 gluttony（贪食／缓吸）双向取舍：贪食每口抽得更多（×1.35）、抽得更密（间隔 ×0.75），
 *   但种子存续更短（×0.7）——总抽量接近、见效更快；缓吸存续 ×1.25、间隔 ×1.15，抽得久而稳。
 */
namespace PokemonSkills {
    actionParameters.define("leechseed", {
        reach: formula(
            F.base(8, "基础")
                .plus(F.level().minus(30).max(0).times(0.1).as("等级"))
                .plus(F.stat("specialAttack").times(0.015).as("特攻"))
                .clamp(6, 13).round(1),
            "播种距离", {
                unit: " 格",
                description: "种子能撒到多远；等级与特攻越高越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.035).as("速度")).clamp(3, 14).round(0),
            "起手", "把种子送出去需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(7, "基础").minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 11).round(0),
            "收招", "撒种之后的收势；速度快的个体收得更利落。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.25).as("速度")).clamp(35, 110).round(0),
            "冷却", "两次撒种之间的等待；速度快的个体恢复快。"),
        seedSpeed: formula(
            F.base(0.8, "基础").plus(F.stat("speed").times(0.002).as("速度")).clamp(0.5, 1.3).round(2),
            "种子速度", {
                unit: " 格/刻",
                description: "种子飞向目标的速度；快个体抛得更急。"
            }),
        seedRadius: formula(
            F.base(0.3, "基础").plus(F.body("height").minus(1.4).times(0.08).as("体型")).clamp(0.2, 0.6).round(2),
            "判定半径", {
                unit: " 格",
                description: "种子的横向判定半径；大个子判定更宽。"
            }),
        seedTicks: seconds(
            F.base(300, "基础").plus(F.level().times(4).as("等级")).plus(F.stat("specialAttack").times(0.6).as("特攻"))
                .times(F.when(F.pref("gluttony"), F.const(0.7), F.const(1.25)).as("汲取方式"))
                .clamp(180, 760).round(0),
            "种子存续", "根在目标身上扎多久；走完自己的时间或被外力解除都会枯萎。等级与特攻越高越久。"),
        interval: seconds(
            F.base(60, "基础").minus(F.stat("speed").times(0.1).as("速度"))
                .times(F.when(F.pref("gluttony"), F.const(0.75), F.const(1.15)).as("汲取方式"))
                .clamp(30, 90).round(0),
            "抽取间隔", "每隔多久从目标身上抽一口；速度快的个体抽得更密，贪食再 ×0.75。"),
        drain: percent(
            F.base(0.06, "基础").plus(F.stat("specialAttack").times(0.0004).as("特攻"))
                .times(F.when(F.pref("gluttony"), F.const(1.35), F.const(1)).as("汲取方式"))
                .clamp(0.04, 0.16),
            "每口抽量", "每次从目标身上抽走其最大生命的比例；特攻越高抽得越多，贪食再 ×1.35。这一口回补施放者。"),
        vines: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(50).as("特攻")).clamp(6, 16).round(0),
            "藤蔓条数", {
                unit: " 条",
                description: "连接目标与施放者的藤蔓与光点数量；特攻越高越密，画面按它发射。"
            })
    });

    stages("leechseed", [{ level: 40, values: { reach: 10.6, seedTicks: 440 } }, { level: 55, values: { reach: 11.6, seedTicks: 520 } }]);

    describe("leechseed", [
        { key: "description.0", values: ["reach", "seedTicks"] },
        { key: "description.1", values: ["interval", "drain"] },
        { key: "description.2", values: ["seedSpeed", "seedRadius", "vines"] },
        { key: "gluttony.on", values: [], when: function (context) { return read(context.detail.values, ["gluttony"]) === true; } },
        { key: "gluttony.off", values: [], when: function (context) { return read(context.detail.values, ["gluttony"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.seedTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.seedTicks"] }
    ]);
}
