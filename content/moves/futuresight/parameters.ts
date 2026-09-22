/**
 * 预知未来 / futuresight —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 120／命中 100／PP 10；onTry 给目标一方挂 slotCondition futuremove
 *   （duration 3），两回合后按原施法者的数据对那一格打出一次念力攻击；「在使用招式２回合后，
 *   向对手发送一团念力进行攻击」（Cobblemon 1.8）。
 *
 * 翻译：不隔空即时命中，而是在目标头顶放出一团属于自己的念力，悬停一段时间后落下——
 *   延迟本身就是余地：对手读得到它悬在哪、还有多久落，能抢时间治疗、加防、或把战斗拖出锁定范围。
 *   即使施法者被收回，这团念力也按预兆兑现（效果挂在施法者身上、随其存在而维持）。
 *   与同族分开：祈愿把愿星送上高空、兑现的是治疗；预知未来悬在**对手**头顶、兑现的是一次特殊伤害。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   sight      念力威力随特攻与等级；久候式更重。
 *   delay      兑现延迟随等级；久候式更长、速报式更短。
 *   hangHeight 悬停高度随体型高度。
 *   reach      锁定距离随特攻与体型。
 *   radius     判定半径随体型高度。
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 */
namespace PokemonSkills {
    export const futureSightId = "futuresight";
    export const futureSightScene = "world_combat:move_futuresight";
    export const futureSightCharge = "world_combat:futuresight_charge";
    export const futureSightSeal = "world_combat:futuresight_seal";
    export const futureSightStatus = "futuresight";
    export const futureSightSendText = "world_combat.move.futuresight.text.send";
    export const futureSightHitText = "world_combat.move.futuresight.text.hit";
    export const futureSightFizzleText = "world_combat.move.futuresight.text.fizzle";
    export const futureSightReferenceHang = 3;

    defineDamage(futureSightId, "sight", {}, {});

    actionParameters.define(futureSightId, {
        sight: formula(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-25, 70))
                .plus(F.level().minus(25).times(0.6).clamp(0, 22))
                .times(F.when(F.pref("prolonged", text("worldcombat.skill.futuresight.preference.prolonged")), F.const(1.2), F.const(0.85)))
                .clamp(80, 240).round(1),
            "念力威力", { unit: "威力", description: "念力落下时结算的特殊威力；施法者特攻越高、等级越高越强。久候式更重。对手特防、相性与暴击在命中时另算。" }),
        delay: seconds(
            F.base(100).plus(F.level().minus(20).max(0).times(1.2).clamp(0, 40))
                .times(F.when(F.pref("prolonged", text("worldcombat.skill.futuresight.preference.prolonged")), F.const(1.4), F.const(0.75)))
                .clamp(50, 240).round(0),
            "兑现延迟", "从放出到念力落下的时间；久候式更久、给对手更多准备余地，速报式更快、更难反应。"),
        hangHeight: formula(
            F.base(3).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.4)).clamp(2.5, 5).round(2),
            "悬停高度", { unit: "格", description: "念力悬在对手头顶多高；身形越大悬得越高，落下的距离也越远。" }),
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-2, 6))
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 2)).clamp(9, 22).round(1),
            "锁定距离", { unit: "格", description: "能锁定多远的对手；特攻越高、身形越大锁得越远。它也是本招的实际射程。" }),
        radius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.05, 0.25)).clamp(0.5, 0.95).round(2),
            "落下半径", { unit: "格", description: "念力落下时罩住多大一圈；大个子凝出的念团更宽，画面与判定共用它。" }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5)).clamp(7, 16).round(0),
            "起手", "把念力凝住并送上去需要多久；快个体更早放手。"),
        settle: seconds(F.base(9).clamp(5, 15).round(0), "收招", "送出念力之后收势的时间。"),
        recharge: seconds(
            F.base(150).minus(F.level().minus(20).max(0).times(1.0).clamp(0, 50)).clamp(90, 210).round(0),
            "冷却", "两次预知之间的等待；等级越高越熟练。")
    });

    stages(futureSightId, [
        { level: 50, values: { sight: 150, delay: 130 } }
    ]);

    describe(futureSightId, [
        { key: "description.0", values: ["sight", "delay"] },
        { key: "description.1", values: ["hangHeight", "reach", "radius"] },
        { key: "description.2", values: ["tempo", "settle", "recharge"] },
        { key: "prolonged.on", values: [], when: function (context) { return read(context.detail.values, ["prolonged"]) === true; } },
        { key: "prolonged.off", values: [], when: function (context) { return read(context.detail.values, ["prolonged"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sight", "tier.0.delay"] }
    ]);
}
