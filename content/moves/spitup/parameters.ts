/**
 * 喷出 / spitup —— 参数、数值来源与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、特殊、威力 0、命中 100、PP 10、单体、不接触；
 *   威力 = 蓄力层数 × 100（没有蓄力层就使不出，用后清空全部层数）。蓄力由「蓄力 / stockpile」提供。
 *
 * 翻译：把「将积蓄的力量撞向对手」落成**一次把攒下的压缩力吐出去**——蓄了几层就有多重，弹体更大更快、命中处炸得更开；
 *   吐完把人一起放空，那几层防护也跟着交出去。它在本组是唯一**读自己存量**的一招，也是唯一靠与另一招（蓄力）配合
 *   才成立的一招。与三压招分开：那三招读对手还剩多少，这一招读自己攒了多少，并且出手后自己会变弱。
 *
 * 借共享身份读层数：蓄力单元把层数写在带 `world_combat:status/stockpile` 的身份上（amplifier = 层数），
 *   喷射只按这个身份与振幅换算，不认识蓄力单元的私有效果 id；放空也用同一身份 `CombatStatus.cure`，
 *   蓄力单元会自己收回防护等级并散开光壳。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   spit     吐出威力：每层基准 70 + 特攻偏移 + 体重偏移，再乘**层数**（1..3）与喷散系数——层数就是它的威力条。
 *   speed    弹速：速度给初速，层数再添一点冲劲。
 *   nozzle   判定半径：碰撞箱宽度与层数决定弹体多粗。
 *   reach    射程：特攻给远度，等级给一点分寸。
 *   spread   喷散张角：碰撞箱宽度决定锥形摊多开（喷散式）。
 *   motes    光点/颗粒数：层数与特攻换算，驱动画面密度。
 *   tempo／aftercast／recharge：速度定节奏；喷散式更快更省。
 *
 * 配置 `spray`（喷散式，默认关）双向取舍：开＝换成身前 `spread` 度的锥形，一次罩住多个敌人，弹体更近但更省更快，
 *   代价是每个目标威力 ×0.68；关（直喷式）＝一发重弹，单点威力最高、射程最远。
 *
 * 伤害段 `spit`：威力只随施法者自己的层数与数据走，不随目标变化，因此不做逐目标重算。
 */
namespace PokemonSkills {
    export const spitupId = "spitup";
    export const spitupScene = "world_combat:move_spitup";
    /** 蓄力的共享身份（见 stockpile 单元）；层数读该身份效果的 amplifier。 */
    export const spitupStockpile = "stockpile";
    export const spitupMaxLayers = 3;
    /** 表现里直喷的参考半径（格）：服务端传 scale = 实际判定半径 / 这个值。 */
    export const spitupReference = 0.22;

    /** 当前蓄力层数 0..3，只认共享身份，不依赖蓄力单元的私有 id。 */
    export function spitupLayers(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const effect = CombatStatus.representative(world, actor, spitupStockpile);
        return effect === null ? 0 : Math.max(0, Math.min(spitupMaxLayers, Math.round(effect.amplifier())));
    }

    // 共享身份 state.stockpile：公式与详情都能读到此刻的层数，读的是同一个真实 MobEffect。
    defineFacts(spitupId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "state.stockpile") return undefined;
            const paid = context.action && context.action.data("world_combat:spitup/layers");
            if (paid !== null && paid !== undefined) return Number(JSON.parse(paid).layers);
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return spitupLayers(context.world, context.actor);
        } };
    });

    actionParameters.define(spitupId, {
        /** 吐出威力：(70 + 特攻偏移[−10,26] + 体重偏移[−4,18]) × 层数(1..3)；喷散 ×0.68；夹 38..300。 */
        spit: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-10, 26))
                .plus(F.body("weight").minus(50).times(0.1).clamp(-4, 18))
                .times(F.state("stockpile", text("worldcombat.skill.spitup.value.layers")))
                .times(F.when(F.pref("spray", text("worldcombat.skill.spitup.preference.spray")), F.const(0.68), F.const(1)))
                .clamp(38, 300).round(1),
            "吐出威力", {
                unit: "威力",
                description: "这一口吐出去的总威力：以每层基准乘上**当前蓄力层数**（1～3），再乘配置系数。层数是它真正的威力条；特攻与体重决定每层的底子。没有蓄力层时本招根本使不出。对手特防、相性与暴击在命中时另算。"
            }),
        /** 弹速：0.95 + (速度−55)×0.008[−0.12,0.4] + 层数×0.09；夹 0.8..1.9。 */
        speed: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.12, 0.4))
                .plus(F.state("stockpile", text("worldcombat.skill.spitup.value.layers")).times(0.09))
                .clamp(0.8, 1.9).round(2),
            "弹速", {
                unit: "格/刻",
                description: "弹体离口的速度；速度快的个体吐得更急，层数越高压得越紧、飞得越快。"
            }),
        /** 判定半径：0.2 + (宽度−0.9)×0.14[−0.03,0.2] + 层数×0.04；夹 0.16..0.55。 */
        nozzle: formula(
            F.base(0.2).plus(F.body("width").minus(0.9).times(0.14).clamp(-0.03, 0.2))
                .plus(F.state("stockpile", text("worldcombat.skill.spitup.value.layers")).times(0.04))
                .clamp(0.16, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "弹体的碰撞半径；身板越宽、层数越多弹体越粗，越难被侧移躲开。"
            }),
        /** 射程：8 + (特攻−60)×0.05[−1.5,4] + (等级−30)×0.05[−1,2]；夹 6..16。 */
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4))
                .plus(F.level().minus(30).times(0.05).clamp(-1, 2)).clamp(6, 16).round(1),
            "射程", {
                unit: "格",
                description: "这一口能吐到多远，也是本招的实际射程来源；特攻越高、等级越高吐得越远。"
            }),
        /** 喷散张角：46 + (宽度−0.9)×10[−6,20]；夹 36..84。 */
        spread: formula(
            F.base(46).plus(F.body("width").minus(0.9).times(10).clamp(-6, 20)).clamp(36, 84).round(0),
            "喷散张角", {
                unit: "度",
                description: "喷散式把这一口摊成多宽的锥形；身板越宽摊得越开。判定扇面与画出的扇面同角。"
            }),
        /** 颗粒数：14 + 层数×9 + (特攻−60)×0.18[−4,14]；夹 12..54。 */
        motes: formula(
            F.base(14).plus(F.state("stockpile", text("worldcombat.skill.spitup.value.layers")).times(9))
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-4, 14)).clamp(12, 54).round(0),
            "颗粒数", {
                unit: "点",
                description: "压缩光点与命中碎光的数量，驱动画面密度；层数越多、特攻越高颗粒越密。"
            }),
        /** 起手：6 − (速度−55)×0.02[−1.5,2]；喷散 −1；夹 3..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.spitup.preference.spray")), F.const(-1), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "把力从身体推上喉咙的时间；速度越快越短，喷散式更省一势。"),
        /** 收招：6 − (速度−55)×0.015[−1,1.5]；喷散 −1；夹 3..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.spitup.preference.spray")), F.const(-1), F.const(0)))
                .clamp(3, 10).round(0),
            "收招", "吐完咽回的时间；速度快的个体更利落，喷散式更短。"),
        /** 冷却：20 − (等级−25)×0.08[0,4]；喷散 −2；夹 12..30。 */
        recharge: seconds(
            F.base(20).minus(F.level().minus(25).times(0.08).clamp(0, 4))
                .plus(F.when(F.pref("spray", text("worldcombat.skill.spitup.preference.spray")), F.const(-2), F.const(0)))
                .clamp(12, 30).round(0),
            "冷却", "再攒一次、再吐一口前的等待；等级越高回得越快，喷散式更省。")
    });

    defineDamage(spitupId, "spit", {}, {});

    stages(spitupId, [
        { level: 30, values: { spit: 78 } },
        { level: 48, values: { spit: 92, reach: 11 } }
    ]);

    describe(spitupId, [
        { key: "description.0", values: ["spit"] },
        { key: "description.1", values: ["reach", "speed", "nozzle"] },
        { key: "spend", values: [] },
        { key: "spray.on", values: ["spread"], when: function (context) { return read(context.detail.values, ["spray"]) === true; } },
        { key: "spray.off", values: [], when: function (context) { return read(context.detail.values, ["spray"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spit"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spit", "tier.1.reach"] }
    ]);
}
